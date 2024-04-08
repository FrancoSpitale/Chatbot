import { MAKE_ADD_TO_CALENDAR, MAKE_ADD_TO_CALENDAR_2, MAKE_GET_FROM_CALENDAR } from 'src/config'

/**
 * get calendar
 * @returns 
 */
const getCurrentCalendar = async (): Promise<string[]> => {
    const dataCalendarApi = await fetch(MAKE_GET_FROM_CALENDAR)
    const json: { date: string, name: string }[] = await dataCalendarApi.json()
    console.log({ json })
    const list = json.filter(({date, name}) => !!date && !!name).reduce((prev, current) => {
        prev.push(current.date)
        return prev
    }, [])
    return list
}

const getCurrentAppointments = async (): Promise<{ date: string, name: string, phone: string, NumeroFila: number }[]> => {
    const dataCalendarApi = await fetch(MAKE_GET_FROM_CALENDAR)
    const json: { date: string, name: string, phone: string, NumeroFila: number }[] = await dataCalendarApi.json()
    console.log({ json })
    const appointments = json.filter(({ date, name, phone, NumeroFila }) => !!date && !!name && !!phone && !!NumeroFila);
    return appointments;
}


/**
 * add to calendar
 * @param body 
 * @returns 
 */
const appToCalendar = async (payload: { name: string, email: string, startDate: string, endData: string, phone: string }) => {
    try {
        const dataApi = await fetch(MAKE_ADD_TO_CALENDAR, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload)
        })
        return dataApi
    } catch (err) {
        console.log(`error: `, err)
    }
}

const appToCalendar_2 = async (payload: { NumeroFila: number }) => {
    try {
        const dataApi = await fetch(MAKE_ADD_TO_CALENDAR_2, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload)
        })
        return dataApi
    } catch (err) {
        console.log(`error: `, err)
    }
}

export { getCurrentCalendar, appToCalendar, getCurrentAppointments, appToCalendar_2}