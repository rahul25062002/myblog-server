const router = require('express').Router();
const Authorize = require('../middleware/Authorize');
const {
    loginGithub,
    autoLoginGithub,
    registerJwt,
    loginJwt,
    autoLoginJwt,
    logoutJwt,
    refreshTokenGithub,
    refreshTokenJwt
} = require('../controller/authController');


router.get('/login/github', loginGithub );

router.post('/autologin/github',autoLoginGithub );

router.post('/refresh/jwt',refreshTokenJwt);

router.post('/refresh/github',refreshTokenGithub);

router.post('/register/jwt',registerJwt );

router.post('/login/jwt', loginJwt );

router.post('/autologin/jwt',autoLoginJwt );

router.use(Authorize);
router.get('/logout',logoutJwt);

module.exports = router;