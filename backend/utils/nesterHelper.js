/**
 * Transforms a flat array of comments into a nested structure based on parent-child relationships.
 * @param {Array} flatComments Rows from the recursive CTE query
 * @returns {Array} Nested comment structure
 */

const buildCommentTree = (flatComments) => {
    if(!flatComments || flatComments.length === 0) return [];

    const map = {};
    const tree = [];

    //Map all items for access (O(1) complexity)
    flatComments.forEach(comment => {
        map[comment.id] = { ...comment, replies: [] };
    });

    //Build the tree structure
    flatComments.forEach(comment => {
        const commentId = comment.id;
        const parentId = comment.parent_id;

        if(parentId) {
            if(map[parentId]) {
                map[parentId].replies.push(map[commentId]);
            }
        } else {
            //Top-level comment
            tree.push(map[commentId]);
        }
    });

    return tree;
}

module.exports = { buildCommentTree };