import e from "express"
import express from "express"
import cors from 'cors'
import cookieParser from "cookie-parser"


const app = express()

//configuration of cors
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

//form incoming data limit
app.use(express.json({ limit: '16kb' }))

// url incoming data configuration
app.use(express.urlencoded({ extended: true, limit: '16kb' }))
//temp place to keep assets
app.use(express.static("public"))
app.use(cookieParser())



export { app }