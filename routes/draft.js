const router = require('express').Router();
const Authorize = require('../middleware/Authorize');
const draftController = require('../controller/draftController');
const pool = require('../dbconfig');


router.get("/:id",draftController.getDraftById);

router.use(Authorize);

router.get("/",draftController.getDraftByEmail);

router.post('/create',draftController.createDraft);

router.get('/publish/:id',draftController.publishDraft);

router.put('/:id',draftController.updateDraft);

router.delete("/:id",draftController.deleteDraft);

module.exports = router;