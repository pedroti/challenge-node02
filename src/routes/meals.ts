import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { knex } from '../database'
import { randomUUID } from 'crypto'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function mealsRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [checkSessionIdExists] }, async request => {
    const { sessionId } = request.cookies
    const meals = await knex('meals').where('session_id', sessionId).select()
    return { meals }
  })

  app.get('/:id', { preHandler: [checkSessionIdExists] }, async request => {
    const { sessionId } = request.cookies
    const getMealsParamsSchema = z.object({
      id: z.string().uuid(),
    })
    const params = getMealsParamsSchema.parse(request.params)
    return await knex('meals')
      .where({ session_id: sessionId, id: params.id })
      .first()
  })

  app.get('/summary', { preHandler: [checkSessionIdExists] }, async request => {
    const { sessionId } = request.cookies
    const totalMeals = await knex('meals')
      .where({ session_id: sessionId })
      .count()
    const onDietMeals = await knex('meals')
      .where({ session_id: sessionId, is_on_diet: 'yes' })
      .count()
    const offDietMeals = await knex('meals')
      .where({ session_id: sessionId, is_on_diet: 'no' })
      .count()
    const bestOnDietSequence = await knex('meals').where({
      session_id: sessionId,
    })
    let bestSequence = 0
    let actualSequence = 0
    bestOnDietSequence.forEach(meal => {
      if (meal.is_on_diet == 'yes') {
        actualSequence++
        if (actualSequence > bestSequence) {
          bestSequence = actualSequence
        }
      } else {
        actualSequence = 0
      }
    })
    return { totalMeals, onDietMeals, offDietMeals, bestSequence }
  })

  app.post('/', async (request, reply) => {
    const createMealBodySchema = z.object({
      name: z.string(),
      description: z.string(),
      isOnDiet: z.enum(['yes', 'no']),
    })
    const { name, description, isOnDiet } = createMealBodySchema.parse(
      request.body
    )

    let sessionId = request.cookies.sessionId
    if (!sessionId) {
      sessionId = randomUUID()
      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
    }

    await knex('meals').insert({
      id: crypto.randomUUID(),
      name,
      description,
      is_on_diet: isOnDiet,
      session_id: sessionId,
    })
    return reply.status(201).send()
  })

  app.put(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const { sessionId } = request.cookies
      const getMealsParamsSchema = z.object({
        id: z.string().uuid(),
      })
      const updateMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        isOnDiet: z.enum(['yes', 'no']),
      })
      const { name, description, isOnDiet } = updateMealBodySchema.parse(
        request.body
      )
      const params = getMealsParamsSchema.parse(request.params)
      const meal = await knex('meals')
        .where({ session_id: sessionId, id: params.id })
        .first()
      if (!meal) {
        return reply.status(400).send()
      }
      meal.description = description
      meal.name = name
      meal.is_on_diet = isOnDiet
      await knex('meals')
        .update({ name, description, is_on_diet: isOnDiet })
        .where({ id: meal.id })
      reply.status(201).send()
    }
  )

  app.delete(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const { sessionId } = request.cookies
      const getMealsParamsSchema = z.object({
        id: z.string().uuid(),
      })
      const params = getMealsParamsSchema.parse(request.params)
      await knex('meals')
        .delete()
        .where({ session_id: sessionId, id: params.id })
      return reply.status(201).send()
    }
  )
}
