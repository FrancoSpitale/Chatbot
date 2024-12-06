import 'dotenv/config';
import { createBot, MemoryDB } from '@builderbot/bot';
import AIClass from './services/ai';
import flow from './flows';
import { provider } from './provider';
import cron from 'node-cron';
import { getCurrentCalendar } from "./services/calendar"; // Asegúrate de que la ruta de importación es correcta
import { getCurrentAppointments } from "./services/calendar"; // Asegúrate de que la ruta de importación es correcta
import { parse, isTomorrow } from 'date-fns';

const PORT = process.env.PORT ?? 3001;
const ai = new AIClass(process.env.OPEN_API_KEY, 'gpt-3.5-turbo');

const parseDate = (dateString) => {
    const dateFormat = 'yyyy/MM/dd HH:mm:ss'; // Este es el formato de tus fechas
    return parse(dateString, dateFormat, new Date());
};

const main = async () => {
    const { httpServer } = await createBot({
        database: new MemoryDB(),
        provider,
        flow,
    }, { extensions: { ai } });

    cron.schedule("0 11 * * *", async () => {
    // cron.schedule('* * * * *', async () => {   
        try {
            const appointments = await getCurrentAppointments();
            console.log(appointments);
    
            if (!Array.isArray(appointments)) {
                console.error('La lista de citas no es un arreglo');
                return;
            }
    
            appointments.forEach(appointment => {
                const appointmentDate = parseDate(appointment.date);
                if (isTomorrow(appointmentDate)) {
                    console.log(`Tienes una cita mañana con ${appointment.name} en ${appointment.date}.`);
                    // Aquí puedes utilizar el número de teléfono para enviar un mensaje
                    provider.sendText(`${appointment.phone}@c.us`, `${appointment.name} recuerda, tienes una cita programada para mañana ${appointment.date}.`);

                }
            });
        } catch (error) {
            console.error(`Error al verificar las citas para mañana: ${error.message}`);
        }
    });

    httpServer(+PORT);
    console.log(`Ready for ${PORT}`);
}

main();