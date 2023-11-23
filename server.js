const express = require('express');
const cors = require('cors');
const app = express();
const pool = require('./dbconfig');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
// app.use(express.static('public'));

app.get('/check',(req,res)=>res.json('ok'));
app.use('/auth', require('./routes/auth'));
app.use('/post',require('./routes/post'));
app.use('/draft',require('./routes/draft'));


const connectToDb = async () => {
    try {
        const res = await pool.query(
            `select 'connected to db' as status`
        );

        console.log(res.rows[0].status);
        app.listen(5000, () => {
            console.log('server listening port : 5000');
        })
    } catch (error) {
        console.log('some error occured',error);
    }
};

connectToDb();
