import { addKeyword, EVENTS } from "@builderbot/bot";
import AIClass from "../services/ai";
import { getHistoryParse, handleHistory } from "../utils/handleHistory";
import { generateTimer } from "../utils/generateTimer";
import { getCurrentCalendar } from "../services/calendar";
import { getFullCurrentDate } from "src/utils/currentDate";
import { flowConfirm } from "./confirm.flow";
import { addMinutes, isWithinInterval, format, parse, startOfWeek, isValid } from "date-fns";
import { es } from 'date-fns/locale';
import { getDurationMeet } from "../config";

const WORKING_HOURS_START = 9;
const WORKING_HOURS_END = 17;

const PROMPT_FILTER_DATE = `
### Contexto
Eres un asistente de inteligencia artificial. Tu propósito es determinar la fecha y hora que el cliente quiere, en el formato yyyy/MM/dd HH:mm:ss.

### Fecha y Hora Actual:
{CURRENT_DAY}

### Registro de Conversación:
{HISTORY}

Asistente: "{respuesta en formato (yyyy/MM/dd HH:mm:ss)}"
`;

const generatePromptFilter = (history) => {
    const nowDate = getFullCurrentDate();
    const mainPrompt = PROMPT_FILTER_DATE
        .replace('{HISTORY}', history)
        .replace('{CURRENT_DAY}', nowDate);

    return mainPrompt;
}

const parseDate = (input) => {
    const dateFormats = [
        'yyyy/MM/dd HH:mm:ss',
        'dd/MM/yyyy HH:mm',
        'dd/M/yyyy HH:mm',
        'dd/MM/yyyy H:mm',
        'dd/M/yyyy H:mm',
        'dd/MM/yyyy HH', // Formato con hora sin minutos (ej. 11hs)
        'dd/M/yyyy HH',
        'dd/MM/yy HH:mm', // Formato con año en dos dígitos
        'dd/M/yy HH:mm',
        'yyyyMMddHHmm', // Formato sin separadores
        'ddMMyyyyHHmm',
        'yyyyMMdd', // Solo fecha sin separadores
        'ddMMyyyy',
        // Aquí puedes agregar más formatos según los patrones de fecha y hora que recibas
    ];
    for (const format of dateFormats) {
        const parsedDate = parse(input, format, new Date());
        if (isValid(parsedDate)) {
            return parsedDate;
        }
    }
    return null;
}

const flowSchedule = addKeyword(EVENTS.ACTION).addAction(async (ctx, { extensions, state, flowDynamic, endFlow }) => {
    await flowDynamic('Dame un momento para consultar la agenda...');
    const ai = extensions.ai as AIClass;
    const history = getHistoryParse(state);
    const list = await getCurrentCalendar();
    const now = new Date();

    const listParse = list
        .map((d) => {
            try {
                const parsedDate = parse(d, 'yyyy/MM/dd HH:mm:ss', new Date());
                //if (isNaN(parsedDate)) {
                //    throw new Error(`Invalid date: ${d}`);
                //}
                return parsedDate;
            } catch (error) {
                console.error(`Error parsing date: ${d}`, error);
                return null;
            }
        })
        .filter(date => date !== null)
        .map((fromDate) => ({ fromDate, toDate: addMinutes(fromDate, getDurationMeet()) }));

    const promptFilter = generatePromptFilter(history);

    const { date } = await ai.desiredDateFn([
        {
            role: 'system',
            content: promptFilter
        }
        
    ]);

    const desiredDate = parseDate(date);
    
    if (!desiredDate) {
        console.log("Fecha ingresada:", date, "Fecha parseada:", desiredDate);
        await flowDynamic("Por favor, proporciona la fecha y la hora en el siguiente formato: 'dd/MM/yyyy HH:mm'. Por ejemplo, si deseas agendar una cita para el 22 de abril de 2024 a las 10 de la mañana, debes escribir: '22/04/2024 10:00'. Asegúrate de incluir tanto la fecha como la hora completa.");
        return endFlow();
    }

    const desiredStartHour = parseInt(format(desiredDate, 'H'), 10);
    const desiredEndHour = parseInt(format(addMinutes(desiredDate, getDurationMeet()), 'H'), 10);
    let workingHoursEnd = desiredDate.getDay() === 6 ? 13 : WORKING_HOURS_END; 
  
    if (desiredStartHour < WORKING_HOURS_START || desiredStartHour >= workingHoursEnd || desiredEndHour > workingHoursEnd) {
        await flowDynamic(`Lo siento, nuestro horario de atención es de ${WORKING_HOURS_START}:00 a ${WORKING_HOURS_END}:00 de lunes a viernes, y los sábados hasta las 13:00.`);
        return endFlow();
    }

    const isDateAvailable = listParse.every(({ fromDate, toDate }) => {
        if (!toDate) {
            toDate = addMinutes(fromDate, getDurationMeet());
        }
        return desiredDate >= toDate || addMinutes(desiredDate, getDurationMeet()) <= fromDate;
    });


    if (!isDateAvailable) {
        const startOfWeekDate = startOfWeek(now, { weekStartsOn: 1 });
        const endOfWeekDate = addMinutes(startOfWeekDate, 30 * 24 * 60);
        const availableSlots = {};

        for (let currentDate = startOfWeekDate; currentDate < endOfWeekDate; currentDate = addMinutes(currentDate, 60)) {
            if (currentDate.getDay() === 0) {
                continue;
            }

            let workingHoursEnd = WORKING_HOURS_END;
            if (currentDate.getDay() === 6) { 
                workingHoursEnd = 13; // Asumiendo que el sábado cierra a las 13:00
            }

            for (let i = 0; i < 60; i += getDurationMeet()) {
                const slotStart = addMinutes(currentDate, i);
                const slotEnd = addMinutes(slotStart, getDurationMeet());

                const slotStartHour = parseInt(format(slotStart, 'H'), 10);
                const slotEndHour = parseInt(format(slotEnd, 'H'), 10);

                let isSlotWithinWorkingHours = slotStartHour >= WORKING_HOURS_START && slotStartHour < workingHoursEnd && slotEndHour <= workingHoursEnd;

                const isSlotBooked = listParse.some(({ fromDate, toDate }) => isWithinInterval(slotStart, { start: fromDate, end: toDate }));

                if (!isSlotWithinWorkingHours || isSlotBooked) {
                    continue; // Siguiente intervalo si no es válido
                }

                const formattedDate = format(currentDate, 'EEEE dd/MM/yyyy', { locale: es });
                availableSlots[formattedDate] = (availableSlots[formattedDate] || []).concat(format(slotStart, 'HH:mm', { locale: es }));
            }
        }

        let message = 'Lo siento, esa hora ya está reservada. Aquí tienes los horarios disponibles para la semana:\n';

        for (const [date, times] of Object.entries(availableSlots)) {
            message += `\n${date}:\n- ${times.join('\n- ')}\n`;
        }

        await flowDynamic(message);
        await handleHistory({ content: message, role: 'assistant' }, state);
        return endFlow();
    }

    const formattedDateFrom = format(desiredDate, 'HH:mm', { locale: es });
    const formattedDateTo = format(addMinutes(desiredDate, getDurationMeet()), 'HH:mm', { locale: es });
    const message = `¡Perfecto! Tenemos disponibilidad de ${formattedDateFrom} a ${formattedDateTo} el día ${format(desiredDate, 'dd/MM/yyyy')}. ¿Confirmo tu reserva? *si*`;
    await handleHistory({ content: message, role: 'assistant' }, state);
    await state.update({ desiredDate });

    const chunks = message.split(/(?<!\d)\.\s+/g);
    for (const chunk of chunks) {
        await flowDynamic([{ body: chunk.trim(), delay: generateTimer(150, 250) }]);
    }
}).addAction({ capture:true }, async ({ body }, { gotoFlow, flowDynamic, state }) => {

    if(body.toLowerCase().includes('si')) return gotoFlow(flowConfirm);
    
    await flowDynamic('¿Alguna otra fecha y hora?');
    await state.update({ desiredDate: null });
});

export { flowSchedule };
