const Users = require('../models/user')

const commentsParser = async (comments) => {
    let aux = [];
    let list = [];

    for (const comment of comments) {
        const user = await Users.findById(comment.user_id)
        if (user) {
            list.push(comment.user_id)
            aux.push({
                comment, user_data: {
                    name: user.name,
                    avatar: user.avatar || false
                }
            })
        }
    }
    return { comments: aux, list };
};

module.exports = commentsParser;