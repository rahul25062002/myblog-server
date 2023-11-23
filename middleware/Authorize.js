const axios = require('axios');
const pool = require('../dbconfig');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

const authorizeGithubToken = async (token) => {
    // console.log('here');
    const url = "https://api.github.com/user";
    const result = await axios.get(url, {
        headers : {
            "Authorization": `Bearer ${token}`
        }
    });

    return result.data.email;
}

const authorizeJwtToken = (token) => {

    const decoded = jwt.verify(
        token,
        JWT_SECRET
    );

    return decoded.email;
}

const authorizeUser = async (req, res, next) => {
    let token = req.headers.authorization;
    let token_type = req.headers.token_type;


    if (!token || !token_type)
        return res.status(400).json({
            message: 'token and token_type are required'
        });

    token = token.split(' ')[1];

    try {
        let email = '';
        if (token_type === 'GITHUB')
            email = await authorizeGithubToken(token);
        else
            email = authorizeJwtToken(token);

        // console.log(email);
        req.body = {...req.body,email};
        next();
    } catch (error) {
        return res.status(401).json({
            message : "Access token expired",
            error
        })
    }
};


module.exports =  authorizeUser;
