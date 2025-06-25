const conf = require('../config/conf');
function queryDatabase(query, params, callback) {
    conf.pool.getConnection((err, connection) => {
        if (err) {
            console.error("获取数据库连接失败:", err);
            callback(null, err);
            return;
        }

        // 执行查询
        connection.query(query, params, (error, results) => {
            // 释放连接
            connection.release();

            if (error) {
                console.error("数据库查询失败:", error);
                callback(null, error);
                return;
            }

            // 执行回调
            callback(results, null);
        });
    });
}


module.exports = { queryDatabase };