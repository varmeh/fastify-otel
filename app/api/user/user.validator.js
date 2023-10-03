import joi from 'joi'

export const userSchema = joi.object({
    name: joi.string().required(),
    age: joi.number().integer().min(0).required()
})
