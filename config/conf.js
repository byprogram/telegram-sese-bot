var mysql = require('mysql');



module.exports = {
    pool: mysql.createPool({
        connectionLimit: 50,  // 最大连接数，您只需要一个 `connectionLimit`
        host: '',
        port: 3306,           // mysql端口
        user: '',         // mysql用户名
        password: '', // mysql密码
        database: '',     // mysql数据库
        multipleStatements: true,  // 支持执行多条 SQL 语句
        waitForConnections: true,  // 连接池中没有连接时是否等待
        queueLimit: 0             // 排队等待的最大数量（0 表示无限制）
    }),
    registerBalance:999999,
    inviterAmount:50,
    startButton: [
        ["🏠 首页", "👤 我的"],
      ],
    messageButton: [
        [{ text: "🎥 观看视频", callback_data: "watch" }, { text: "💰 获取积分", callback_data: "more" }],
      ],
    videoButton: [
        [{ text: "▶️ 继续", callback_data: "watch" }, { text: "🔄 更换", callback_data: "change_video" }]
    ],
    activityGroupId : "",
    currentUpdateCategory : "未知",
    techVideo:""
}