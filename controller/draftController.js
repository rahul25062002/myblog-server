const pool = require('../dbconfig');
const { randomUUID } = require('crypto');
// const saveImg = require('../middleware/SaveImage');

const getDraftById = async (req, res) => {
    const { id } = req.body;

    if (!id)
        return res.status(400).json({
            message: "id is required"
        });

    try {
        const result = await pool.query(`
            SELECT CONTENT FROM DRAFT
            WHERE ID = '${id}';
        `);

        return res.json({
            message: "draft retrieved successfully",
            draft: result.rows[0],
        });
    } catch (error) {
        return res.status(500).json({
            message: "some error occured",
            error
        })
    }
};

const getDraftByEmail = async (req, res) => {
    const { email } = req.body;

    if (!email)
        return res.status(400).json({
            message: "email is required",
        });

    try {
        const result = await pool.query(`
            SELECT TITLE,TAGS,DESCRIPTION,COVER_IMAGE,ID,CONTENT
            FROM DRAFT 
            WHERE CREATED_BY = '${email}';
        `);

        return res.json({
            message: "draft retrieved successfully",
            drafts: result.rows,
        })
    } catch (error) {
        return res.status(500).json({
            message: "draft not retrieved",
            error
        });
    }
}

const createDraft = async (req, res) => {
    const { draft, email } = req.body;
    const id = randomUUID();

    // console.log(draf);

    if (!draft?.title || !email)
        return res.status(400).json({
            message: 'title and email are required',
        });

    draft.id = id;
    // if (draft.cover_image)
    //     draft.cover_image = await saveImg(draft.cover_image, id);

    if( draft.content )
        draft.content = draft.content.replaceAll(`'`,`"`);

    // console.log(draft.content);

    if (draft.tags)
        draft.tags = "{" + draft.tags.map(tag => {
            return `"${tag}"`;
        }).join() + "}";


    let keys = Object.keys(draft);
    let colString = keys.join();
    let valString = keys.map(key => `'${draft[key]}'`).join();

    // console.log(colString);
    // console.log(valString);


    try {
        const result = await pool.query(`
            INSERT INTO DRAFT(
                ${colString},
                created_by
            )
            VALUES(
                ${valString},
                '${email}'
            );
        `);

        return res.status(201).json({
            message: 'new draft created',
            id
        });
    } catch (error) {
        return res.status(500).json({
            message: 'new post not created',
            error
        })
    }
};

const publishDraft = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query(`
            BEGIN;

            INSERT INTO POST(
                TITLE,TAGS,CONTENT,COVER_IMAGE,CREATED_BY,ID,DESCRIPTION
            ) (
                SELECT TITLE,TAGS,CONTENT,COVER_IMAGE,CREATED_BY,ID,DESCRIPTION
                FROM DRAFT 
                WHERE ID = '${id}'
            );
            DELETE FROM DRAFT
            WHERE ID = '${id}';

            COMMIT;
        `);

        return res.json({
            message: "post published successfully",
        })
    } catch (error) {
        return res.status(500).json({
            message: 'post not published',
            error
        })
    }
};

const updateDraft = async (req, res) => {

    const { email } = req.body;
    const { id } = req.params;
    let draft = req.body.draft;

    if (!id || !draft)
        return res.status(400).json({
            message: 'id and draft are required'
        });

    const result = await pool.query(`
        SELECT CREATED_BY
        FROM DRAFT 
        WHERE ID = '${id}'
    `);

    if (result?.rows[0]?.created_by !== email)
        return res.status(400).json({
            message: "You don't have access to this draft"
        });

    // if (draft?.cover_image)
    //     draft.cover_image = await saveImg(draft.cover_image, id);

    if (draft.tags)
        draft.tags = "{" + draft.tags.map(tag => {
            return `"${tag}"`;
        }).join() + "}";


    let updateStr = Object.keys(draft).map(key => {
        return key + "=" + `'${draft[key]}'`;
    }).join();

    try {
        await pool.query(`
            UPDATE DRAFT 
            SET ${updateStr}
            WHERE ID = '${id}';
        `);

        return res.json({
            message: 'draft saved successfully',
        });
    } catch (error) {
        return res.status(500).json({
            message: 'draft not saved',
            error
        });
    }

};

const deleteDraft = async (req, res) => {
    const { id } = req.params;

    if (!id)
        return res.status(400).json({
            message: "id is required",
        });

    try {
        await pool.query(`
            DELETE FROM DRAFT
            WHERE ID = '${id}';
        `);

        return res.json({
            message: "draft deleted successfully",
        })
    } catch (error) {
        return res.status(500).json({
            message: "draft not deleted",
            error
        })
    }
};

module.exports = {
    getDraftById,
    createDraft,
    publishDraft,
    updateDraft,
    deleteDraft,
    getDraftByEmail
}