const jwt = require('jsonwebtoken');
import {Request, Response, NextFunction} from 'express';

const authGetUser = (req: Request | any, res: Response, next: NextFunction) => {
    try {
        const {token} = req.body;
        if(!token) return res.status(400).json({msg: 'Invalid Authentication.'});

        jwt.verify(token, process.env.ACCESS_TOKEN as string, (err: any, user: any) => {
            if(err) return res.status(400).json({msg: "Invalid Authentication token"})

            req.user = user;

            next();

        });
    } catch (error: any) {
        return res.status(500).json({msg: error.message});
    }
}
module.exports = authGetUser;