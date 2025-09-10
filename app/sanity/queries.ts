import {defineQuery} from "groq"

export const homeQuery = defineQuery("*[_type == 'home'][0]")
