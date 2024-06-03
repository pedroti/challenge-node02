import { mealsRoutes } from './routes/meals'
import cookie from '@fastify/cookie'
import fastify from 'fastify'

export const app = fastify()
app.register(cookie)
app.register(mealsRoutes, { prefix: 'meals' })
