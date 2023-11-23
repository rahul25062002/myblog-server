const { randomUUID } = require('crypto');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();
const pool = require('../dbconfig');
const bcrypt = require('bcrypt');
// const saveImg = require('../middleware/SaveImagez');

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;

const generateToken = (payload)=>{
    let refresh_token = jwt.sign(
        payload,
        JWT_SECRET,
        {
            expiresIn : "30 days"
        }
    );
    let access_token = jwt.sign(
        payload,
        JWT_SECRET,
        {
            expiresIn : "8h"
        }
    );


    return [refresh_token,access_token];
}

const loginGithub = async (req, res) => {
    let code = req?.headers?.code;

    if (!code)
        return res.status(400).json({ message: 'github code not provied' });

    try {
        const url = `https://github.com/login/oauth/access_token?client_id=${GITHUB_CLIENT_ID}&client_secret=${GITHUB_CLIENT_SECRET}&code=${code}`;

        const result = await axios.post(url);

        let resObj = {};
        result.data.split('&').forEach(elem => {
            let temp = elem.split('=');
            resObj = { ...resObj, [temp[0]]: temp[1] };
        });

        let res2 = await axios.get('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${resObj.access_token}`
            }
        });

        res2 = res2.data;

        resObj = {
            message: 'Github Login Successful',
            access_token : resObj.access_token,
            refresh_token : resObj.refresh_token,
            username: res2.login,
            userimg: res2.avatar_url,
            email: res2.email,
            token_type : 'GITHUB'
        }

        // console.log(resObj);

        await pool.query(`
            INSERT INTO ACCOUNT(
                EMAIL,
                USERNAME,
                REFRESH_TOKEN,
                USERIMG,
                TOKEN_TYPE
            ) VALUES(
                '${resObj.email}',
                '${resObj.username}',
                '${resObj.refresh_token}',
                '${resObj.avatar}',
                'GITHUB'
            ) 
            ON CONFLICT (EMAIL)
            DO UPDATE
            SET REFRESH_TOKEN = '${resObj.refresh_token}',
            TOKEN_TYPE = 'GITHUB';
        `);

        return res.status(200).json(resObj);

    } catch (error) {
        return res.status(501).json({
            message: 'some error occured',
            error
        })
    }
}

const autoLoginGithub = async (req, res) => {
    let { refresh_token } = req.body;
    if (!refresh_token)
        return res.status(400).json({ message: "refresh token not found" });

    // console.log(refresh_token);
    const url = `https://github.com/login/oauth/access_token?client_id=${GITHUB_CLIENT_ID}&client_secret=${GITHUB_CLIENT_SECRET}&grant_type=refresh_token&refresh_token=` + refresh_token;
    // console.log(url);


    try {
        const pr = await axios.post(url);
        let resobj = {};
        pr.data.split('&').forEach(elem => {
            let temp = elem.split('=');
            resobj = { ...resobj, [temp[0]]: temp[1] };
        });

        let res2 = await pool.query(`
            UPDATE ACCOUNT 
            SET REFRESH_TOKEN = '${resobj.refresh_token}',
            TOKEN_TYPE = 'GITHUB'
            WHERE REFRESH_TOKEN = '${refresh_token}'
            RETURNING *;
        `);

        return res.json({
            ...res2.rows[0],
            access_token : resobj.access_token
        });
    } catch (error) {
        // console.log(error);
        return res.status(401).json(error);
    }
}

const registerJwt = async (req, res) => {
    const {
        email,
        username,
        password,
        avatar
    } = req.body;

    if (!email || !username || !password || !avatar)
        return res.status(400).json({
            message: 'email, username, image and password are required'
        });

    try {

        const exists = await pool.query(`
            SELECT (
                COUNT(1) > 0
            ) AS FOUND
            FROM ACCOUNT
            WHERE EMAIL = '${email}';
        `);

        if( exists.rows[0].found )
            return res.status(400).json({
                message : "User already exists"
            });

        // const userimg = await saveImg(avatar,email); // save img to serve statically
        const hashedPwd = await bcrypt.hash(password, 10);

        await pool.query(`
            INSERT INTO ACCOUNT(
                EMAIL,
                USERNAME,
                PASSWORD,
                USERIMG,
                TOKEN_TYPE
            ) VALUES(
                '${email}',
                '${username}',
                '${hashedPwd}',
                '${avatar}',
                'JWT'
            );
        `);

        return res.status(201).json({
            message: 'Account created successfully'
        });

    } catch (error) {
        // console.log(error);
        return res.status(500).json({
            message: 'Account not created',
            error
        })
    }

}

const loginJwt = async (req, res) => {
    let {
        email,
        password
    } = req.body;

    if( !email || !password )
        return res.status(400).json({
            message : 'email and password are required'
        });

    try {
        let resobj = await pool.query(`
            SELECT * FROM ACCOUNT
            WHERE EMAIL = '${email}';
        `)

        if( !resobj.rowCount )
            return res.status(400).json({
                message : "email doesn't exist"
            });
        
        const match = await bcrypt.compare(password,resobj?.rows[0]?.password);
        if( !match )
            return res.status(400).json({
                message : "password doesn't match"
            });

        const [refresh_token,access_token] = generateToken({ email });
        
        // console.log(refresh_token,email);
        await pool.query(`
            UPDATE ACCOUNT 
            SET REFRESH_TOKEN = '${refresh_token}',
            TOKEN_TYPE = 'JWT'
            WHERE EMAIL = '${email}';
        `)

        resobj = {
            email,
            username : resobj.rows[0].username,
            userimg : resobj.rows[0].userimg,
        }
        // console.log(resobj);

        return res.json({
            message : "login successfull",
            ...resobj,
            refresh_token,
            access_token,
            token_type : 'JWT'
        });

    } catch (error) {
        res.status(500).json({
            message : "login failed",
            error
        })
    }
}

const autoLoginJwt = async (req, res) => {
    let { refresh_token } = req.body;
    
    try {
        let resobj = await pool.query(`
        SELECT * FROM ACCOUNT
        WHERE REFRESH_TOKEN = '${refresh_token}' 
        AND TOKEN_TYPE = 'JWT';
        `);
        
        jwt.verify(
            refresh_token,
            JWT_SECRET,
            async( err,decoded )=>{
                if( err )
                return res.status(400).json({
                    message : 'jwt not valid',
                    err,
                });
                
                // console.log(decoded.email, resobj.rows[0]);
                if( decoded.email!==resobj?.rows[0]?.email )
                return res.status(400).json({
                    message : "decoded email doesn't match",
                });
                
                let [_,access_token] = generateToken({email : decoded.email});
                
                resobj = {
                    email : resobj.rows[0].email,
                    username : resobj.rows[0].username,
                    userimg : resobj.rows[0].userimg,
                    token_type : resobj.rows[0].token_type,
                    refresh_token,
                    access_token,
                    token_type : 'JWT'
                }
                
                return res.status(200).json({
                    message : 'autologin successfull',
                    ...resobj
                })
            }
            )
        
        } catch (error) {
        res.status(500).json({
            message : 'autologin failed',
            error
        })
    }
}

const logoutJwt = async (req,res) =>{
    const { email } = req.body;
    
    try {
        await pool.query(`
        UPDATE ACCOUNT
        SET REFRESH_TOKEN = '${randomUUID()}'
        WHERE email = '${email}';
        `);
        
        return res.json({
            message : 'logout successfull'
        });
    } catch (error) {
        return res.json({
            message : 'logout failed',
            error
        })
    }
}

const refreshTokenJwt = async(req,res)=>{
    const { refresh_token } = req.body;
    if( !refresh_token )
        return res.status(400).json({
            message : "refresh token is required"
        });
    
    try {
        const { email } = jwt.verify(
            refresh_token,
            JWT_SECRET
        );

        const [_,access_token] = generateToken({ email });

        return res.json({
            message : "token refreshed",
            access_token,
            refresh_token
        })

    } catch (error) {
        return res.status(401).json({
            message : 'refresh token expired hello',
            error
        })
    }
}

const refreshTokenGithub = async(req,res)=>{
    let { refresh_token } = req.body;
    if (!refresh_token)
        return res.status(400).json({ message: "refresh token not found" });

    const url = `https://github.com/login/oauth/access_token?client_id=${GITHUB_CLIENT_ID}&client_secret=${GITHUB_CLIENT_SECRET}&grant_type=refresh_token&refresh_token=` + refresh_token;


    try {
        const pr = await axios.post(url);
        let resobj = {};
        pr.data.split('&').forEach(elem => {
            let temp = elem.split('=');
            resobj = { ...resobj, [temp[0]]: temp[1] };
        });

        let res2 = await pool.query(`
            UPDATE ACCOUNT 
            SET REFRESH_TOKEN = '${resobj.refresh_token}',
            TOKEN_TYPE = 'GITHUB'
            WHERE REFRESH_TOKEN = '${refresh_token}';
        `);

        return res.json({
            message : "token refreshed",
            access_token : resobj.access_token,
            refresh_token : resobj.refresh_token
        });
    } catch (error) {
        return res.status(401).json(error);
    }
}


module.exports = {
    loginGithub,
    autoLoginGithub,
    registerJwt,
    loginJwt,
    autoLoginJwt,
    logoutJwt,
    refreshTokenGithub,
    refreshTokenJwt
}