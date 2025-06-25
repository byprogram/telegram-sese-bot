
const { queryDatabase } = require('../common/database'); 
function getConfigValues(callback) {
  const query = `
    SELECT type, value, value2
    FROM config 
    WHERE type IN ("sese_bot_token", "tg_admin_groupid");
  `;
  
    queryDatabase(query, [], (results, error) => {
      if (error) {
        console.error("数据库查询失败:", error.message);
        callback(null, error); // 回传错误
        return;
      }
  
      if (results.length === 0) {
        const err = new Error("未找到所需的配置项");
        console.error(err.message);
        callback(null, err); // 回传自定义错误
        return;
      }
  
      // 构建返回的配置对象
      const config = {};
      results.forEach((row) => {
        config[row.type] = row.value;
      });
      config['botUsername'] = results[1]['value2']
      // 回传结果
      callback(config, null);
    });
  }
module.exports = { getConfigValues };