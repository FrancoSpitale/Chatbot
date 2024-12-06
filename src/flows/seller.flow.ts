import { addKeyword, EVENTS } from "@builderbot/bot";
import { generateTimer } from "../utils/generateTimer";
import { getHistoryParse, handleHistory } from "../utils/handleHistory";
import AIClass from "../services/ai";
import { getFullCurrentDate } from "src/utils/currentDate";
import { pdfQuery } from "src/services/pdf";
import { setDurationMeet } from "../config";
import { getCurrentAppointments } from "../services/calendar"; // Asegúrate de que la ruta de importación es correcta
import { appToCalendar_2 } from "../services/calendar"; // Asegúrate de que la ruta de importación es correcta
import { parse, isTomorrow } from 'date-fns';

//import { provider } from './provider';


const PROMPT_SELLER = `Como experto en ventas con aproximadamente 15 años de experiencia en embudos de ventas y generación de leads, tu tarea es mantener una conversación agradable, responder a las preguntas del cliente sobre nuestros productos y, finalmente, guiarlos para reservar una cita. Tus respuestas deben basarse únicamente en el contexto proporcionado:

### DÍA ACTUAL
{CURRENT_DAY}

### HISTORIAL DE CONVERSACIÓN (Cliente/Vendedor)
{HISTORY}

### BASE DE DATOS
{DATABASE}

Para proporcionar respuestas más útiles, puedes utilizar la información proporcionada en la base de datos. El contexto es la única información que tienes. Ignora cualquier cosa que no esté relacionada con el contexto.

### EJEMPLOS DE RESPUESTAS IDEALES:

- buenas bienvenido a..
- un gusto saludarte en..
- por supuesto tenemos eso y ...

### INTRUCCIONES
- Mantén un tono profesional y siempre responde en primera persona.
- NO ofrescas promociones que no existan en la BASE DE DATOS
- Trata de capturar qué tratamiento necesita el paciente

Tratamientos con su duración: 
- Consulta 1 hora
- Interconsulta 30 minutos
- Instalación ortodoncia 2 horas
- Control ortodoncia 1 hora y 20 minutos
- Instalación ortopedia (aparatos) 30 minutos
- Control ortopedia (aparatos) 1 hora
- Urgencia ortodoncia/ortopedia 30 minutos
- Limpieza dental 2 horas
- Blanqueamiento externo profesional 2 horas
- Blanqueamiento externo ambulatorio 1 hora
- Control pos blanqueamiento 30 minutos
- Tratamiento preventivo pos consulta 1 hora y 20 minutos
- Contención removible 1 hora y 30 minutos
- Contención fija 1 hora y 30 minutos
- Contención fija + limpieza 2 horas y 30 minutos

Respuestas útiles adecuadas para enviar por WhatsApp (en español):`;

export const generatePromptSeller = (history, database, ) => {
    const nowDate = getFullCurrentDate();
    return PROMPT_SELLER.replace('{HISTORY}', history)
                        .replace('{CURRENT_DAY}', nowDate)
                        .replace('{DATABASE}', database);
};

const treatmentDurations = {
    "Consulta": 60,
    "Interconsulta": 30,
    "Instalación ortodoncia": 120,
    "Control ortodoncia": 80,
    "Instalación ortopedia (aparatos)": 30,
    "Control ortopedia (aparatos)": 60,
    "Urgencia ortodoncia/ortopedia": 30,
    "Limpieza dental": 120,
    "Blanqueamiento externo profesional": 120,
    "Blanqueamiento externo ambulatorio": 60,
    "Control pos blanqueamiento": 30,
    "Tratamiento preventivo pos consulta": 80,
    "Contención removible": 90,
    "Contención fija": 90,
    "Contención fija + limpieza": 150
};

const flowSeller = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { state, flowDynamic, extensions }) => {
        try {
            console.log("Contexto:", ctx);
            const ai = extensions.ai as AIClass;
            const history = getHistoryParse(state);
            let awaitingConfirmation = false;

            if (ctx && ctx.body) {

                const responseText = ctx.body.trim().toLowerCase();
                const cancelRegex = /(cancelar)(?:\s+(\d+))?/; // Expresión regular ajustada con grupos de captura
                const cancelMatch = responseText.match(cancelRegex);

                let cancelCommand = null;
                let cancelNumber = null;

                if (cancelMatch) {
                    cancelCommand = cancelMatch[1]; // Captura "cancelar"
                    cancelNumber = cancelMatch[2] ? parseInt(cancelMatch[2], 10) : null; // Captura el número si está presente
                }

                // Ahora puedes usar 'cancelCommand' y 'cancelNumber' según sea necesario
                console.log("Comando:", cancelCommand); // Será "cancelar"
                console.log("Número:", cancelNumber); // Será el número si se proporcionó, o null si no
                const dataBase = 'Sin datos'; // Considera integrar una base de datos real aquí
                console.log({ dataBase });
                const promptInfo = generatePromptSeller(history, dataBase);
                if ( cancelCommand === 'cancelar') {
                    
              
                    try {
                        const appointments = await getCurrentAppointments();
                        console.log(appointments);
                    
                        if (!Array.isArray(appointments)) {
                            console.error('La lista de citas no es un arreglo');
                            return;
                        }
                        
                        const parseDate = (dateString) => {
                            const dateFormat = 'yyyy/MM/dd HH:mm:ss'; // Este es el formato de tus fechas
                            return parse(dateString, dateFormat, new Date());
                        };
                    
                        const isFutureDate = (date) => {
                            const today = new Date();
                            return date > today;
                        };
                    
                         
                        appointments.forEach(appointment => {
                           
                            const appointmentDate = parseDate(appointment.date);
                            if (isFutureDate(appointmentDate) && appointment.phone == ctx.from) {
                                console.log(`Tienes una cita futura con ${appointment.name} en ${appointment.date} número de turno ${appointment.NumeroFila}.`);
                                // Aquí puedes utilizar el número de teléfono para enviar un mensaje
                                //provider.sendText(`${appointment.phone}@c.us`, `${appointment.name} recuerda, tienes una cita programada para ${appointment.date}.`);
                                const confirmationMessage = `${appointment.name} tienes un turno en ${appointment.date} número de turno ${appointment.NumeroFila}. Si necesitas eliminarlo escribe: Cancelar ${appointment.NumeroFila}`; 
                                flowDynamic([{ body: confirmationMessage, delay: generateTimer(150, 250) }]);

                                console.log(`Ingresar turno a eliminar.`);
                                const ResponseText = ctx.body.trim().toLowerCase();
                                const promptInfo = generatePromptSeller(history, dataBase);
                                console.log(`${ResponseText}`);
                                console.log(`Turno a cancelar ${ctx.body}`);
                                
                                const dateObject = {
                                 
                                    NumeroFila: appointment.NumeroFila
                                }
                        
                                if(cancelNumber==appointment.NumeroFila)
                                {
                                const confirmationMessage = `Turno Eliminado.`; 
                             
                                flowDynamic([{ body: confirmationMessage, delay: generateTimer(150, 250) }]);
                                appToCalendar_2(dateObject )
                                }

                            }
                        });
                    } catch (error) {
                        console.error(`Error al verificar las citas futuras: ${error.message}`);
                    }
                    

                                  


                    return; // Interrumpir aquí si el usuario quiere cancelar
                }

                // Verificar si es la fase inicial de saludo/conversación
                if (history.length === 0 || responseText === 'hola') {
                    const welcomeMessage = `¡Hola! Bienvenido🤍

Elige la opción del tratamiento que quieras agendar:
1. Consulta (1 hora)
2. Interconsulta (30 minutos)
3. Instalación ortodoncia (2 horas)
4. Control ortodoncia (1 hora)
5. Instalación ortopedia (aparatos) (30 minutos)
6. Control ortopedia (aparatos) (30 minutos)
7. Urgencia ortodoncia/ortopedia (30 minutos)
8. Limpieza dental (solo si estás bajo tratamiento) (2 horas)
9. Blanqueamiento externo profesional (2 horas)
10. Blanqueamiento externo ambulatorio (1 hora)
11. Control pos blanqueamiento (30 minutos)
12. Tratamiento preventivo pos consulta (1 hora y 20 minutos)
13. Contención removible (1 hora y 30 minutos)
14. Contención fija (1 hora y 30 minutos)
15. Contención fija + limpieza (2 horas y 30 minutos)
                  
Por favor, responde con su número correspondiente🦷`;
                      

                    await flowDynamic([{ body: welcomeMessage, delay: generateTimer(150, 250) }]);
                    
                    

                    return; // Detener aquí si es el saludo inicial
                }
                                    
                const response = await ai.createChat([
                    {
                        role: 'system',
                        content: promptInfo
                    }
                ]);

                const userResponseText = ctx.body.trim();
                const selectedTreatmentIndex = parseInt(userResponseText, 10);

                if (!isNaN(selectedTreatmentIndex) && selectedTreatmentIndex > 0 && selectedTreatmentIndex <= Object.keys(treatmentDurations).length) {
                    const selectedTreatment = Object.keys(treatmentDurations)[selectedTreatmentIndex - 1];
                    const selectedDuration = treatmentDurations[selectedTreatment];

                    if (selectedDuration) {
                        console.log(`Tratamiento seleccionado: ${selectedTreatment}`);
                        console.log(`Duración del tratamiento seleccionado para agendar: ${selectedDuration} minutos`);
                        setDurationMeet(selectedDuration);
                        console.log(`Valor de setDurationMeet después de establecer la duración: ${setDurationMeet}`);
                    
                        const confirmationMessage = `Tratamiento seleccionado: ${selectedTreatment}\nDuración del tratamiento: ${selectedDuration} minutos. ¿Desea proceder con la reserva? Responda con 'Sí' para confirmar e indique la la fecha y la hora en el siguiente formato: 'dd/MM/yyyy HH:mm'. Por ejemplo, si deseas agendar una cita para el 22 de abril de 2024 a las 10 de la mañana, debes escribir: '22/04/2024 10:00'. Asegúrate de incluir tanto la fecha como la hora completa`;
                        await flowDynamic([{ body: confirmationMessage, delay: generateTimer(150, 250) }]);
                       
                        // La variable awaitingConfirmation se establece en true después de enviar el mensaje de confirmación
                        awaitingConfirmation = true;
                    } else {
                        await flowDynamic([{ body: 'No se encontró duración para el tratamiento seleccionado. Por favor, seleccione un número de tratamiento válido.', delay: generateTimer(150, 250) }]);
                    }
                    
                }

                if (awaitingConfirmation && userResponseText.toLowerCase() === 'sí') {
                    const requestDateTimeMessage = `Por favor, indique la fecha y hora de la reserva en formato "DD/MM/AAAA HH:MM", por ejemplo: "23/05/2024 11:30".`;
                    await flowDynamic([{ body: requestDateTimeMessage, delay: generateTimer(150, 250) }]);
                }

                await handleHistory({ content: userResponseText, role: 'customer' }, state);
            } else {
                console.error("El contexto o el cuerpo del mensaje es indefinido.");
            }
        } catch (err) {
            console.error(`[ERROR]:`, err);
        }
    });

export { flowSeller };