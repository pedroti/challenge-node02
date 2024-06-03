import 'knex'

declare module 'knex/types/tables' {
  export interface Tables {
    meals: {
      id: string
      name: string
      description: string
      is_on_diet: string
      created_at: string
      session_id?: string
    }
  }
}
