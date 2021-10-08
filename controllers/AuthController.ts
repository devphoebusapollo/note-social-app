import {Request, Response}  from 'express';
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mysql = require('mysql');
const dotenv = require('dotenv');
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const sendEmail = require('../middlewares/SendMail');
const sendEmailPassword = require('../middlewares/PassWordResetMail');
dotenv.config();

//Database connection
const {
    MYSQL_USER,
    MYSQL_PASSWORD,
    MYSQL_DATABASE,
    CLIENT_URL
} = process.env;

const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database:  MYSQL_DATABASE
});

const userController = {
    register: (req: Request, res: Response) => {
        try {
            pool.getConnection(async (err: any, connection: any) => {
                if(err) throw err;
                console.log(`Connected as id ${connection.threadId}`);
    
                const {username, email, password, confirmPassword, city, province, country}: {username: string; email: string; password: string; confirmPassword: string; admin: boolean; city: string; province: string; country: string} = req.body;
    
                if(!username || !email || !password || !confirmPassword) {
                    return res.status(400).json({msg: "Please fill in the required information"});
                };
    
                if(!validateEmail(email)) {
                    return res.status(400).json({msg: "Please provide a valid email address"});
                };
    
                if(password.length < 6 || password.length > 20) {
                    return res.status(400).json({msg: "Password must be atleast 6 chracters long and not more than 20 characters long"});
                };

                if(req.body.password !== confirmPassword) {
                    return res.status(400).json({msg: "Passwords don't match"});
                };

                const passwordHash = await bcrypt.hash(password, 12);

                const newUser = {
                    username, email, password: passwordHash, city, province, country
                };
            
            //this is the payload when the token is created so this will also be used to verify the token later in the activation

                /*connection.query('INSERT into users SET ?', newUser, (err: any, rows: any) => {
                    //When done with the connection, release it
                    connection.release();
                    
                    if(!err) {
                        res.status(200).json({msg: "Registered successfully!"});
                    } else {
                        console.log(err);
                    }
                })*/
                connection.query('SELECT * FROM users WHERE email = ?', email, (err: any, result: any) => {
                    if(err) throw err;
                    if(result.length > 0) {
                        return res.status(400).json({msg: "This email is already in use"});
                    } else {
                        /*connection.query('INSERT into users SET ?', newUser);
                        return res.status(200).json({msg: "Registered successfully"});*/
                        const activation_token = createActivationToken(newUser);

                        const url = `${CLIENT_URL}/user/activate/${activation_token}`;
                        sendEmail(email, url, 'Verify Email Address');

                        res.json({msg: "Registration Successful! Please activate your email to start."});
                    }
                })
            })
        } catch (error: any) {
            return res.status(500).json({msg: error.message});
        }
    },
    activateEmail: async (req: Request, res: Response) => {
        try {
            pool.getConnection((err: any, connection: any) => {
            const activationToken = req.params.activationtoken;

            const user = jwt.verify(activationToken, process.env.ACTIVATION_TOKEN);

            const {username, email, password, city, province, country} = user;

            const registerUser = {
                username, email, password, city, province, country
            };

            connection.query('INSERT into users SET ?', registerUser);

            return res.status(200).json({msg: "Registered successfully"});
            })

        } catch (error: any) {
            return res.status(500).json({msg: error.message});
        }
    },
    login: async (req: Request, res: Response) => {
        try {
            pool.getConnection(async (err: any, connection: any) => {
            
                if(err) throw err;

                const {email, password} = req.body;

                connection.query('SELECT * from users WHERE email = ?', email, async (err: any, result: any) => {
                    try {
                        if(result.length === 0) {
                            return res.status(400).json({msg: "Sorry! we don't recognize the email you provided"});
                        };

                        const isMatch = await bcrypt.compare(password, result[0].password);

                        if(!isMatch) return res.status(400).json({msg: "Password is incorrect"});

                        const refresh_token = createRefreshToken({id: result[0].id});

                        res.cookie('refreshtoken', refresh_token, {
                            httpOnly: true,
                            path: '/user/refresh_token',
                            maxAge: 7*24*60*60*1000
                        });

                        return res.status(200).json(result);

                    } catch(error) {
                        console.log(error);
                    }
                })
            })
        } catch (error: any) {
            return res.status(500).json({msg: error.message});
        }
    },
    logout: async (req: Request, res: Response) => {
        try {
            res.clearCookie('refreshtoken', {path: '/user/refresh_token'})
            return res.json({msg: "Logged out!"});
        } catch (error: any) {
            return res.status(500).json({msg: error.message});
        }
    },
    forgotPassword: (req: Request, res: Response) => {
        pool.getConnection((err: any, connection: any) => {
            if(err) throw err;
            const {email} = req.body;
            connection.query('SELECT * from users WHERE email = ?', email, (err: any, result: any) => {
                if(result.length === 0) {
                    return res.status(400).json({msg: "We didn't recognize this email address"});
                } else {
                    const access_token = createAccessToken({id: result[0].id});
                    const url = `${CLIENT_URL}/user/access_token/${access_token}`;

                    sendEmailPassword(email, url, "Reset your password");
                    res.json({msg: "Email sent! Check your email to reset your password"});
                }
            })
        })
    },
    resetPassword: (req: Request | any, res: Response) => {
        try {
            pool.getConnection(async(err: any, connection: any) => {

                if(err) throw err;

                const {id} = req.user;
                const {password} = req.body;

                const hashedPassword = await bcrypt.hash(password, 12);

                connection.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id], (err: any, result: any) => {
                    if(err) throw err;

                    res.status(200).json({msg: "Password changed successfully"});
                })
            })
        } catch(error) {
            console.log(error);
        }
    },
    getAccessToken: (req: Request, res: Response) => {

            const rf_token = req.cookies.refreshtoken;

            if(!rf_token) return res.status(400).json({msg: "Please login"});

            jwt.verify(rf_token, process.env.REFRESH_TOKEN, (err: any, user: any) => {
                if(err) return res.status(400).json({msg: "Please login"});

                const access_token = createAccessToken({id: user.id});

                res.json({access_token});
        })
    },
    getAllUser: (req: Request, res: Response) => {
        pool.getConnection((err: any, connection: any) => {
            if(err) throw err;
            console.log(`Connected as id ${connection.threadId}`);
    
            connection.query('SELECT * from users', (err: any, rows: any) => {
                connection.release();
                
                if(!err) {
                    res.send(rows);
                } else {
                    console.log(err);
                }
            })
        })
    },
    getUser: (req: Request, res: Response) => {
        const id = req.params.id;
        pool.getConnection((err: any, connection: any) => {
            if(err) throw err;
            connection.query('SELECT * from users WHERE id = ?', id, (err: any, result: any) => {
                connection.release();

                if(!err) {
                    res.status(200).json(result);
                } else {
                    console.log(err);
                }
            })
        })
    },
    updateUser: (req: Request, res: Response) => {
        pool.getConnection((err: any, connection: any) => {
            const {username, email, admin, city, province, country} = req.body;
            const id = req.params.id;
            if(err) throw err;

            connection.query('UPDATE users SET username = ?, email = ?, admin = ?, city = ?, province = ?, country = ? WHERE id = ?', [username, email, admin, city, province, country, id], (err: any, result: any) => {

                if(err) {
                    console.log(err);
                } else {
                    connection.query('SELECT id, username, email, admin, city, province, country from users WHERE id = ?', id, (err: any, user: any) => {
                        connection.release();

                        if(err) throw err;

                        res.status(200).json(user);
                    })
                }
            });
        })
    },
    deleteUser: (req: Request, res: Response) => {
        pool.getConnection((err: any, connection: any) => {
            const id = req.params.id;
            if (err) throw err;

            connection.query('DELETE from users WHERE id = ?', id, (err: any, result: any) => {
                connection.release();

                if(err) throw err;

                res.status(200).json({msg: "User has been deleted"});
            })
        })
    }
};

function validateEmail(email: string) {
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
};

const createActivationToken = (payload: any) => {
    return jwt.sign(payload, process.env.ACTIVATION_TOKEN as string, {expiresIn: '5m'})
};

const createAccessToken = (payload: any) => {
    return jwt.sign(payload, process.env.ACCESS_TOKEN as string, {expiresIn: '15m'})
};

const createRefreshToken = (payload: any) => {
    return jwt.sign(payload, process.env.REFRESH_TOKEN as string, {expiresIn: '7d'})
};

module.exports = userController;