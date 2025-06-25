const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { getConfigValues } = require('./tools/tgbot'); 
const conf = require('./config/conf');
const { queryDatabase } = require('./common/database'); 
const app = express();
var currentUpdateCategory = conf.currentUpdateCategory;
const pendingSubmissions = {}; 
var activityText = `🎁 <b>邀请好友，轻松赚积分！</b>\n\n` +
          `📌 <b>奖励规则：</b>\n` +
          `1️⃣ 每成功邀请 <code>1</code> 名有效用户，即可获得 <code>50</code> 积分！\n` +
          `2️⃣ <b>邀请排行榜</b> 火热进行中，4 月 20 号发放 <b>USDT</b> 大奖！\n` +
          `3️⃣ 每次成功邀请后，还有机会获得 <b>随机空投积分</b>，惊喜不断！\n\n` +
          `🔥 <b>邀请越多，赚得越多！快来冲榜！</b>`
function startBot() {
  getConfigValues((config, error) => {
    if (error) {
      console.error("Bot 启动失败:", error.message);
      return;
    }
    const botToken = config.sese_bot_token;
    const botUsername = config.botUsername;
    const adminGroupId = config.tg_admin_groupid;

    if (!botToken) {
      console.error("未找到 bot_token 配置");
      return;
    }

    // 初始化 Telegram Bot
    bot = new TelegramBot(botToken, { polling: true });
    bot.sendMessage(adminGroupId, `<b>【Node.js】</b>\n服务叒双又启动了一次~`, {parse_mode: 'HTML'});
    // 监听消息事件
    bot.on("message", (msg) => {
      if (adminGroupId==msg.chat.id) {
          if (msg.video && msg.caption && msg.caption.startsWith("/send ")) {
            const messageCaption = msg.caption.substring(6).trim(); // 提取视频标题说明
            const videoFileId = msg.video.file_id;
        
            if (!videoFileId) {
                return bot.sendMessage(msg.chat.id, "❌ 无法获取视频文件，请重试。");
            }
        
            // 查询所有用户 ID
            const queryUsers = "SELECT user_id FROM sese_user";
            queryDatabase(queryUsers, [], (users, err) => {
                if (err) {
                    console.error("❌ 获取用户列表失败:", err);
                    return bot.sendMessage(msg.chat.id, "❌ 获取用户失败，请稍后重试。");
                }
        
                if (users.length === 0) {
                    return bot.sendMessage(msg.chat.id, "⚠️ 当前没有用户可发送消息。");
                }
        
                const totalUsers = users.length;
                let sentCount = 0;
        
                users.forEach((user, index) => {
                    setTimeout(() => {
                        bot.sendVideo(user.user_id, videoFileId, {
                            caption: messageCaption,
                            parse_mode: "HTML",
                            reply_markup: {
                                keyboard: conf.startButton,
                                resize_keyboard: true
                            }
                        }).then(() => {
                            sentCount++;
                            if (sentCount === totalUsers) {
                                bot.sendMessage(msg.chat.id, `✅ 群发完成，共发送 ${totalUsers} 人`);
                            }
                        }).catch(err => {
                            console.error(`❌ 发送失败: ${user.user_id}`, err);
                        });
                    }, index * 1000);
                });
        
                bot.sendMessage(msg.chat.id, `📢 开始群发视频消息，共 ${totalUsers} 人，请耐心等待...`);
            });
        }else if (msg.text && msg.text.startsWith("/label ")) {
            currentUpdateCategory = msg.text.replace("/label ", "").trim();
            bot.sendMessage(msg.chat.id, `上传的视频标题已设置为：${currentUpdateCategory}`);
        }
        
      }
          if (msg.video) {
            let groupId = msg.media_group_id || msg.video.file_id; // 组ID，单个视频用自身file_id
            let category = removeEmojis(msg.caption || currentUpdateCategory) || '未知';
        
            queryDatabase(
                `INSERT INTO sese_video (video_id, category, user_id, group_id) VALUES (?, ?, ?, ?)`,
                [msg.video.file_id, category, msg.from.id, groupId],
                (insertResult, insertError) => {
                    if (insertError) {
                        console.error("数据库插入失败:", insertError.message);
                        return;
                    }
        
                    bot.sendMessage(
                        adminGroupId,
                        `<b>【视频上传成功】</b>\n<code>${msg.video.file_id}</code>\n\n#${category}`,
                        { parse_mode: 'HTML' }
                    );
        
                    // 只有当 caption 存在时，更新所有同组视频的 category
                    if (msg.caption) {
                        queryDatabase(
                            `UPDATE sese_video SET category = ? WHERE group_id = ? AND category = '未知'`,
                            [category, groupId],
                            (updateResult, updateError) => {
                                if (updateError) {
                                    console.error("数据库更新失败:", updateError.message);
                                }
                            }
                        );
                    }
                }
            );
        }else if (msg.text && msg.text == "1") {
            const queryTotalUsers = "SELECT COUNT(*) AS total_users FROM sese_user;";
            const queryTodayUsers = "SELECT COUNT(*) AS today_users FROM sese_user WHERE DATE(created_time) = CURDATE();";
        
            const queryTotalViews = "SELECT COUNT(*) AS total_views FROM sese_view_list;";
            const queryTodayViews = "SELECT COUNT(*) AS today_views FROM sese_view_list WHERE DATE(created_at) = CURDATE();";
        
            const queryVideoCategories = "SELECT COUNT(*)  FROM sese_video WHERE status = 'approved';";
        
            // 查询总用户数 & 今日注册用户数
            queryDatabase(queryTotalUsers, [], (totalUserResults, totalUserErr) => {
                if (totalUserErr) {
                    console.error("❌ 查询总用户数失败:", totalUserErr);
                    return;
                }
        
                queryDatabase(queryTodayUsers, [], (todayUserResults, todayUserErr) => {
                    if (todayUserErr) {
                        console.error("❌ 查询今日注册用户失败:", todayUserErr);
                        return;
                    }
        
                    const totalUsers = totalUserResults[0]?.total_users || 0;
                    const todayUsers = todayUserResults[0]?.today_users || 0;
        
                    // 查询累计观看数 & 今日观看数
                    queryDatabase(queryTotalViews, [], (totalViewResults, totalViewErr) => {
                        if (totalViewErr) {
                            console.error("❌ 查询累计观看数失败:", totalViewErr);
                            return;
                        }
        
                        queryDatabase(queryTodayViews, [], (todayViewResults, todayViewErr) => {
                            if (todayViewErr) {
                                console.error("❌ 查询今日观看数失败:", todayViewErr);
                                return;
                            }
        
                            const totalViews = totalViewResults[0]?.total_views || 0;
                            const todayViews = todayViewResults[0]?.today_views || 0;
        
                            // 查询各类别的视频数量
                            queryDatabase(queryVideoCategories, [], (categoryResults, categoryErr) => {
                                if (categoryErr) {
                                    console.error("❌ 查询视频类别失败:", categoryErr);
                                    return;
                                }
        
                                let categoryStats = "";
                                if (categoryResults.length > 0) {
                                    categoryStats += `🎞️ <b>视频数量：</b> <code>${categoryResults[0]['COUNT(*)']}</code> 部\n`;

                                } else {
                                    categoryStats = "⚠️ 暂无视频数据";
                                }
        
                                // 发送统计数据
                                const responseMessage = `<b>📊 数据统计</b>\n\n` +
                                    `👥 <b>总注册用户：</b> <code>${totalUsers}</code>\n` +
                                    `📅 <b>今日新增用户：</b> <code>${todayUsers}</code>\n\n` +
                                    `📺 <b>累计播放：</b> <code>${totalViews}</code> 部\n` +
                                    `📅 <b>今日播放：</b> <code>${todayViews}</code> 部\n\n` +
                                    `${categoryStats}`;
        
                                bot.sendMessage(msg.chat.id, responseMessage, { parse_mode: "HTML" });
                            });
                        });
                    });
                });
            });
        }else if (msg.text && msg.text === "2") {
            bot.sendMessage(msg.chat.id, `✅ 已为收到补充积分任务，正在执行`);
            queryDatabase(
                `SELECT user_id, balance FROM sese_user WHERE balance < 20`, 
                [], 
                (results, err) => {
                    if (err) {
                        console.error("查询低积分用户出错:", err);
                        return bot.sendMessage(msg.chat.id, "⚠️ 查询失败，请稍后再试！");
                    }
        
                    if (results.length === 0) {
                        return bot.sendMessage(msg.chat.id, "✅ 没有需要补充积分的用户！");
                    }
                    queryDatabase(
                      `UPDATE sese_user SET balance = 20 WHERE balance < 20`, 
                      [], 
                      (updateResult, updateErr) => {
                          if (updateErr) {
                              console.error(`❌ 更新用户积分失败:`, updateErr);
                          }
                      }
                  );
                    // 更新积分并发送通知
                    results.forEach((user, index) => {
                      setTimeout(() => {
                        bot.sendMessage(user.user_id, `🎁 你的积分已补充至 <code>20</code>，快来继续观看视频，享受精彩内容吧！`, { parse_mode: "HTML" });
                        bot.sendMessage(msg.chat.id, `✅ 已为 ${user.nick_name} 补充积分至 20！`);
                      }, index * 2000); // 每条消息间隔 2 秒发送
                    });
        
                    
                }
            );
        }else if (msg.text && msg.text.startsWith("/send ")) {
            const messageContent = msg.text.substring(6).trim(); // 提取群发内容
        
            if (!messageContent) {
                return bot.sendMessage(msg.chat.id, "❌ 发送内容不能为空，请输入 /send + 群发内容");
            }
        
            // 查询所有用户 ID
            const queryUsers = "SELECT user_id FROM sese_user";
            queryDatabase(queryUsers, [], (users, err) => {
                if (err) {
                    console.error("❌ 获取用户列表失败:", err);
                    return bot.sendMessage(msg.chat.id, "❌ 获取用户失败，请稍后重试。");
                }
        
                if (users.length === 0) {
                    return bot.sendMessage(msg.chat.id, "⚠️ 当前没有用户可发送消息。");
                }
        
                const totalUsers = users.length;
                let sentCount = 0;
        
                users.forEach((user, index) => {
                    setTimeout(() => {
                        bot.sendMessage(user.user_id, messageContent, {
                            reply_markup: {
                                keyboard: conf.startButton,
                                resize_keyboard: true
                            },
                            parse_mode: "HTML"
                        }).then(() => {
                            sentCount++;
                            if (sentCount === totalUsers) {
                                bot.sendMessage(msg.chat.id, `✅ 群发完成，共发送 ${totalUsers} 人`);
                            }
                        }).catch(err => {
                            console.error(`❌ 发送失败: ${user.user_id}`, err);
                        });
                    }, index * 1000);
                });
        
                bot.sendMessage(msg.chat.id, `📢 开始群发消息，共 ${totalUsers} 人，请耐心等待...`);
            });
        
        } else if(conf.activityGroupId==msg.chat.id){
        if (msg.text && msg.text=="1") {
          queryDatabase(
            `SELECT nick_name, invite_count FROM sese_user ORDER BY invite_count DESC LIMIT 10`,
            [],
            (results, err) => {
                if (err) {
                    console.error("查询排行榜失败:", err);
                    bot.sendMessage(msg.chat.id, "⚠️ 获取排行榜失败，请稍后再试！");
                    return;
                }
    
                if (results.length === 0) {
                    bot.sendMessage(msg.chat.id, "📊 当前还没有人上榜，快来邀请好友吧！");
                    return;
                }
    
                let leaderboardText = "🏆 <b>邀请排行榜</b> 🏆\n\n";
                results.forEach((row, index) => {
                    let rankEmoji = "";
                    if (index === 0) rankEmoji = "🥇"; // 金牌
                    else if (index === 1) rankEmoji = "🥈"; // 银牌
                    else if (index === 2) rankEmoji = "🥉"; // 铜牌
                    else if (index === 9) rankEmoji = `1️⃣0️⃣`; // 其他排名
                    else rankEmoji = `${index + 1}️⃣`; // 其他排名
    
                    leaderboardText += `${rankEmoji} <b>${restoreName(row.nick_name)}</b> - 邀请 <code>${row.invite_count}</code> 人\n`;
                });
                leaderboardText += "\n🔥 <b>邀请越多，奖励越大！冲刺 USDT 大奖！</b>";
                bot.sendMessage(msg.chat.id, leaderboardText, { 
                  parse_mode: "HTML",
                  reply_markup: {
                      inline_keyboard: [
                          [{ text: "🚀 立即参加活动", url: "https://t.me/hwsexbot?start" }]
                      ]
                  }
              });
            }
          );
        }

      }else if(msg.chat.type=='private' && msg.text){
        if (msg.text.includes("/start") || msg.text==conf.startButton[0][0]) {
            const welcomeMessage = `
🎉 <b>欢迎关注 <a href='https://t.me/sese8_bot?start'>色色吧 • 投稿屋🔞</a> 机器人！</b>

📺 每次观看视频 <b>仅消耗</b> <code>1</code> 积分，快来体验吧！

📤 <b>本机器人支持投稿</b>，上传属于你的视频，审核通过后，其他用户也能在机器人内观看你的投稿！快来分享你的精彩内容吧！🔥
`;
            bot.sendVideo(msg.from.id,conf.techVideo,{
                caption:welcomeMessage,
                parse_mode: "HTML",
                disable_web_page_preview: true,
                reply_markup: {
                    keyboard: conf.startButton, // 使用底部键盘
                    resize_keyboard: true, // 调整键盘大小
                    one_time_keyboard: false // 是否在点击后隐藏（false 让键盘一直显示）
                }
            }).then(res=>{
            queryDatabase(
              `SELECT * FROM sese_user WHERE user_id = ?`,
              [msg.from.id],
              (results, error) => {
                  if (error) {
                      console.error("数据库查询失败:", error.message);
                      return;
                  }
      
                  if (results.length === 0) {
                      // 如果用户不存在，则插入新用户
                      
                      const fullName = `${msg.from.first_name || ""} ${msg.from.last_name || ""}`.trim();
                      queryDatabase(
                          `INSERT INTO sese_user (user_id,nick_name,user_name,balance) VALUES (?,?,?,?)`,
                          [msg.from.id,sanitizeName(msg),msg.from.username?msg.from.username:'无',conf.registerBalance],
                          (insertResult, insertError) => {
                              if (insertError) {
                                  console.error("数据库插入失败:", insertError.message);
                                  return;
                              }
                              bot.sendMessage(
                                msg.from.id, 
                                `🔗 <b>专属邀请链接（👇点击复制）：</b> <code>https://t.me/${botUsername}?start=${msg.from.id}</code>\n\n💰 <b>您的余额：</b> <code>${conf.registerBalance}</code> 积分`, 
                                { 
                                    parse_mode: "HTML",
                                    disable_web_page_preview: true,
                                    reply_markup: {
                                      inline_keyboard:conf.messageButton
                                    }
                                }
                              );
                                const username = msg.from.username 
                                    ? `<a href="https://t.me/${msg.from.username}">【${fullName}】</a>` 
                                    : `【${fullName}】`; // ✅ 确保没有 username 时也有名字

                                bot.sendMessage(adminGroupId, `📣 <b>${username}</b> 注册成功！`, { 
                                    parse_mode: "HTML",
                                });

                            if (msg.text.split(" ")[1]) {
                              const userId = msg.text.split(" ")[1]; // 获取用户ID
                          
                              // 更新积分
                              const updateQuery = `UPDATE sese_user SET balance = balance + ?,invite_count = invite_count + 1 WHERE user_id = ?`;
                              queryDatabase(updateQuery, [conf.inviterAmount, userId], (updateResults, updateErr) => {
                                  if (updateErr) {
                                      console.error("更新积分失败:", updateErr);
                                      return;
                                  }
                          
                                  bot.sendMessage(userId, `📣 <b>【${fullName}】</b> 邀请成功，奖励您 <code>${conf.inviterAmount}</code> 积分！`, { 
                                      parse_mode: "HTML",
                                  });
                              });

                              queryDatabase(`UPDATE sese_user SET inviter = ? WHERE user_id = ?`, [userId,msg.from.id], (updateResults, updateErr) => {
                                if (updateErr) {
                                    console.error("更新邀请人失败:", updateErr);
                                    return;
                                }
                            });
                            }
                          
                          }
                      );
                  } else {
                    const updateQuery = `UPDATE sese_user SET nick_name = ?,user_name = ? WHERE user_id = ?`;
                    queryDatabase(updateQuery, [sanitizeName(msg),msg.from.username?msg.from.username:'无', msg.from.id], (updateResults, updateErr) => {
                              
                        if (updateErr) {
                            console.error("更新积分失败:", updateErr);
                            return;
                        }
                    });
                    bot.sendMessage(
                      msg.from.id, 
                      `🔗 <b>专属邀请链接（👇点击复制）：</b> <code>\nhttps://t.me/${botUsername}?start=${msg.from.id}</code>\n\n💰 <b>您的余额：</b> <code>${results[0].balance}</code> 积分\n\n🎁 <b>邀请好友赚积分！</b> \n前 100 名都有 USDT 奖励，前 30 名更可获得高额奖励！\n每邀请 <code>1</code> 名有效用户，即可 <b>立得</b> <code>${conf.inviterAmount}</code> 积分，邀请越多，赚得越多！`, 
                      { 
                          parse_mode: "HTML",
                          disable_web_page_preview: true,
                          reply_markup: {
                              inline_keyboard: conf.messageButton
                          }
                      }
                    );
                  }
              }
            );
            })
        }else if (msg.text === conf.startButton[0][1]) {
            const telegramId = msg.from.id;
        
            // 查询今日观看数量、总观看数量、投稿数量
            const queryUserStats = `
                SELECT 
                    (SELECT COUNT(*) FROM sese_view_list WHERE telegram_id = ? AND DATE(created_at) = CURDATE()) AS today_views,
                    (SELECT COUNT(*) FROM sese_view_list WHERE telegram_id = ?) AS total_views,
                    (SELECT COUNT(*) FROM sese_video WHERE user_id = ? AND status = 'approved') AS total_uploads
            `;
        
            queryDatabase(queryUserStats, [telegramId, telegramId, telegramId], (userStats, err) => {
                if (err) {
                    console.error("查询观看数据错误:", err);
                    return bot.sendMessage(telegramId, "❌ 查询失败，请稍后重试。");
                }
        
                const { today_views, total_views, total_uploads } = userStats[0];
        
                // 查询用户已选的标题
                const querySelectedCategory = `SELECT current_category FROM sese_user WHERE user_id = ?`;
                queryDatabase(querySelectedCategory, [telegramId], (userCategory, err) => {
                    if (err) {
                        console.error("查询用户标题错误:", err);
                        return bot.sendMessage(telegramId, "❌ 获取用户标题失败，请稍后重试。");
                    }
        
                    const current_category = userCategory.length > 0 ? userCategory[0].current_category : null;
        
                    // 查询视频标题
                    const queryCategories = `SELECT DISTINCT category FROM sese_video WHERE status = 'approved'`;
                    queryDatabase(queryCategories, [], (categories, err) => {
                        if (err) {
                            console.error("查询标题错误:", err);
                            return bot.sendMessage(telegramId, "❌ 获取视频标题失败，请稍后重试。");
                        }
        
                        let categoryButtons = categories.map(cat => ({
                            text: (current_category === cat.category ? '✅ ' : '') + cat.category,
                            callback_data: `select_category:${cat.category}`
                        }));
        
                        let inline_keyboard = [[
                            {
                                text: (current_category === "默认" ? '✅ ' : '') + "默认",
                                callback_data: "select_category:默认"
                            },
                            ...(current_category !== "默认" ? [{
                                text: '✅ ' + current_category, 
                                callback_data: `select_category:${current_category}`
                            }] : [])
                        ]];
                        const messageText = `<b>📊 我的数据：</b>\n\n` +
                        `📅 今日观看：<code>${today_views}</code> 部\n` +
                        `📺 累计观看：<code>${total_views}</code> 部\n` +
                        `📤 投稿数量：<code>${total_uploads}</code> 部\n\n` +
                        `🔍 发送视频标题名称，即可切换标题并获取推荐视频！`;
                        // 发送消息，新增投稿数量信息
                        bot.sendMessage(telegramId, messageText, {
                            reply_markup: { inline_keyboard },
                            parse_mode: "HTML",
                        });
                    });
                });
            });
        }else if(msg.text == "/support"){
            bot.sendMessage(msg.from.id, `<b>一同共建繁荣的电报生态吧！🤝</b>\n\n<a href="https://t.me/byprogramer">Byprogram</a>`,{
                parse_mode: "HTML",
                disable_web_page_preview: true,
            })
        }else if (pendingSubmissions[msg.from.id] && pendingSubmissions[msg.from.id].step === 2) {
            const category = msg.text;
            pendingSubmissions[msg.from.id].category = category;
            pendingSubmissions[msg.from.id].step = 3;

            bot.sendMessage(msg.chat.id, `📌 你输入的标签是：<b>${category}</b>\n\n请确认投稿。`, {
                reply_to_message_id: msg.message_id, 
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "✅ 确认投稿", callback_data: `send_to_admin:${msg.from.id}` },{ text: "❌ 取消投稿", callback_data: `cancel_submit:${msg.from.id}` }],
                    ]
                }
            });
        }else{
            queryDatabase(`UPDATE sese_user SET current_category = ? WHERE user_id = ?`, [msg.text, msg.from.id], (updateResults, updateErr) => {
                if (updateErr) {
                    console.error("更新标题失败:", updateErr);
                    bot.sendMessage(msg.chat.id, "❌ 请发送文字搜索视频哦。");
                    return;
                }

                // 发送随机视频
                sendRandomVideo(msg.chat.id,msg.message_id);
            });
        }
      
      

      }else if(msg.chat.type=='private' && msg.video){
        pendingSubmissions[msg.from.id] = {
            video_id: msg.video.file_id,
            step: 1 // 1 = 等待确认投稿
        };
    
        bot.sendMessage(msg.chat.id, "🎥 你正在投稿视频，请确认是否继续？", {
            reply_to_message_id: msg.message_id, // 让机器人回复用户的视频消息
            reply_markup: {
                inline_keyboard: [
                    [{ text: "✅ 确认投稿", callback_data: `confirm_submit:${msg.from.id}` },{ text: "❌ 取消投稿", callback_data: `cancel_submit:${msg.from.id}` }],
                ]
            }
        });
      }
    });

    bot.on('callback_query', async (callbackQuery) => {
      const msg = callbackQuery.message;
      const userId = callbackQuery.from.id;
      const chatId = msg.chat.id;
      const data = callbackQuery.data;  // 获取 callback_data
      const messageId = msg.message_id;
      if (data.startsWith("send_to_admin:")) {
        if (!pendingSubmissions[userId]) return;
    
        const { video_id, category } = pendingSubmissions[userId];
    
        // 插入数据库，记录投稿
        const insertSubmissionQuery = `
            INSERT INTO sese_video (video_id, user_id, category, status, created_at) 
            VALUES (?, ?, ?, 'pending', NOW())`;
        
        queryDatabase(insertSubmissionQuery, [video_id, userId, category], (result, err) => {
            if (err) {
                console.error("提交投稿失败:", err);
                return bot.sendMessage(chatId, "❌ 投稿提交失败，请稍后重试。");
            }
    
            const submissionId = result.insertId; // 获取投稿的数据库 ID
    
            // 发送到管理员群
            bot.sendVideo(adminGroupId, video_id, {
                caption: `📤 <b>新投稿视频</b>\n👤 投稿用户：<a href="tg://user?id=${userId}">${userId}</a>\n🏷️ 上传：<b>${category}</b>\n\n🔍 请审核！`,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "✅ 通过", callback_data: `confirm_upload:${submissionId}` },{ text: "❌ 拒绝", callback_data: `reject_upload:${submissionId}` }],
                    ]
                }
            });
    
            // 编辑原消息，提示用户已提交
            bot.editMessageText("✅ 投稿已提交至管理员审核，请等待结果。", {
                chat_id: chatId,
                message_id: messageId
            });
    
            delete pendingSubmissions[userId]; // 清除状态
        });
    }
    if (data.startsWith("confirm_submit:")) {
        if (!pendingSubmissions[userId]) return;

        pendingSubmissions[userId].step = 2; // 进入标签输入阶段
        bot.editMessageText("📌 请发送视频的标签（例如：搞笑、Cosplay、舞蹈等）", {
            chat_id: chatId,
            message_id: messageId
        });

    } else if (data.startsWith("cancel_submit:")) {
        delete pendingSubmissions[userId];
        bot.editMessageText("❌ 投稿已取消。", {
            chat_id: chatId,
            message_id: messageId
        });

    } else if (data.startsWith("confirm_upload:")) {
        const submissionId = data.split(":")[1];
    
        const approveQuery = `UPDATE sese_video SET status = 'approved' WHERE id = ?`;
    
        queryDatabase(approveQuery, [submissionId], (result, err) => {
            if (err) {
                console.error("审核失败:", err);
                return bot.sendMessage(adminGroupId, "❌ 审核失败，请稍后重试。");
            }
    
            // 更新审核按钮
            bot.editMessageReplyMarkup({
                inline_keyboard: [
                    [{ text: "✅ 已通过", callback_data: "approved" }]
                ]
            }, { chat_id: chatId, message_id: messageId });
    
            // 查询投稿人信息
            const getUserQuery = `SELECT user_id,video_id FROM sese_video WHERE id = ?`;
            queryDatabase(getUserQuery, [submissionId], (userResult, err) => {
                if (err || userResult.length === 0) {
                    console.error("无法获取投稿人:", err);
                    return;
                }
                const { user_id, video_id } = userResult[0];
                bot.sendVideo(user_id, video_id, {
                    caption:`✅ 投稿通过审核！视频已上线 🎉`
                });
            });
        });
    
    } else if (data.startsWith("reject_upload:")) {
        const submissionId = data.split(":")[1];
    
        const rejectQuery = `UPDATE sese_video SET status = 'rejected' WHERE id = ?`;
    
        queryDatabase(rejectQuery, [submissionId], (result, err) => {
            if (err) {
                console.error("拒绝投稿失败:", err);
                return bot.sendMessage(adminGroupId, "❌ 操作失败，请稍后重试。");
            }
    
            // 更新审核按钮
            bot.editMessageReplyMarkup({
                inline_keyboard: [
                    [{ text: "❌ 已拒绝", callback_data: "rejected" }]
                ]
            }, { chat_id: chatId, message_id: messageId });
    
            // 查询投稿人信息
            const getUserQuery = `SELECT user_id,video_id FROM sese_video WHERE id = ?`;
            queryDatabase(getUserQuery, [submissionId], (userResult, err) => {
                if (err || userResult.length === 0) {
                    console.error("无法获取投稿人:", err);
                    return;
                }
                
                const { user_id, video_id } = userResult[0];
                bot.sendVideo(user_id, video_id, {
                    caption: `❌ 很抱歉，你的投稿未通过审核。`
                });
            });
        });
    }
    if (data === "watch") {
        bot.answerCallbackQuery(callbackQuery.id); // 可选，关闭加载动画
    
        const userId = callbackQuery.from.id;
        queryDatabase(`SELECT balance, current_category FROM sese_user WHERE user_id = ?`, [userId], (results, err) => {
            if (err) {
                console.error("查询用户余额失败:", err);
                return;
            }
    
            if (results.length > 0 && results[0].balance >= 1) {
                const currentCategory = results[0].current_category;
                const updateQuery = `UPDATE sese_user SET balance = balance - 1 WHERE user_id = ?`;
    
                queryDatabase(updateQuery, [userId], (updateResults, updateErr) => {
                    if (updateErr) {
                        console.error("扣除积分失败:", updateErr);
                        return;
                    }
    
                    // 如果选择的是 "默认"，则不按标题筛选
                    const videoQuery = currentCategory === "默认"
                        ? `SELECT * FROM sese_video WHERE status = 'approved' ORDER BY RAND() LIMIT 1;`
                        : `SELECT * FROM sese_video WHERE category LIKE ? AND status = 'approved' ORDER BY RAND() LIMIT 1;`;

                        const queryParams = currentCategory === "默认" ? [] : [`%${currentCategory}%`];
                    
    
                    queryDatabase(videoQuery, queryParams, (videoResults, videoErr) => {
                        if (videoErr) {
                            console.error("查询视频失败:", videoErr);
                            return;
                        }
    
                        if (videoResults.length > 0) {
                            const video = videoResults[0];
                            const messageButton = conf.videoButton;
    
                            queryDatabase(`SELECT * FROM sese_user WHERE user_id = ?;`, [video.user_id], (Results, Err) => {
                                if (Err) {
                                    console.error("查询视频上传用户失败:", Err);
                                    return;
                                }
                                if (!Results[0]) {
                                    return;
                                }
    
                                const uploader = Results[0].user_name!="无"
                                    ? `<a href="https://t.me/${Results[0].user_name}">${restoreName(Results[0].nick_name)}</a>`
                                    : restoreName(Results[0].nick_name);
    
                                const caption = `🎬 <b>投稿：</b>${uploader}\n📌 <b>标题：</b>${video.category}`;
    
                                bot.sendVideo(callbackQuery.message.chat.id, video.video_id, {
                                    caption,
                                    parse_mode: "HTML",
                                    reply_markup: {
                                        inline_keyboard: messageButton
                                    }
                                });
    
                                // 记录观看数据
                                queryDatabase(`INSERT INTO sese_view_list (telegram_id, video_id, message_id) VALUES (?, ?, ?);`, 
                                    [callbackQuery.message.chat.id, video.video_id, callbackQuery.message.message_id], 
                                    (insertResults, insertErr) => {
                                        if (insertErr) {
                                            console.error("记录视频失败:", insertErr);
                                        }
                                    }
                                );
                            });
                        } else {
                            bot.sendMessage(callbackQuery.message.chat.id, "❌ 没有找到可用的视频，发送 <code>默认</code> 恢复！", { parse_mode: "HTML" });
                        }
                    });
                });
            } else {
                bot.sendMessage(callbackQuery.message.chat.id, "❌ 您的积分不足，无法观看视频！", { parse_mode: "HTML" });
            }
        });
    }
    
      if (data === "more") {
        bot.editMessageText(
          activityText,
            {
                chat_id: callbackQuery.message.chat.id,
                message_id: callbackQuery.message.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: 
                    [
                      [{ text: "💌 邀请好友", callback_data: "invite" },{ text: "🏆 邀请排行", callback_data: "leaderboard" }]
                  ]
                },
            }
        )
      }
      
      if (data === "more_video") {
        bot.sendMessage(
          callbackQuery.message.chat.id,activityText,
          {
              parse_mode: "HTML",
              reply_markup: {
                  inline_keyboard: [
                    [{ text: "💌 邀请好友", callback_data: "invite" },{ text: "🏆 邀请排行", callback_data: "leaderboard" }],
                  ]
              }
          }
        );
      
      }
      if (data === "leaderboard") {
        queryDatabase(
            `SELECT nick_name, invite_count FROM sese_user WHERE invite_count > 0 ORDER BY invite_count DESC LIMIT 10;`, 
            [], 
            (results, err) => {
                if (err) {
                    console.error("查询邀请排行榜出错:", err);
                    return bot.sendMessage(callbackQuery.message.chat.id, "⚠️ 获取排行榜失败，请稍后再试！");
                }
        
                if (results.length === 0) {
                    return bot.sendMessage(callbackQuery.message.chat.id, "🏆 暂无邀请记录，快去邀请好友赚积分吧！");
                }
        
                let leaderboardText = "🏆 <b>邀请排行榜（TOP 10）</b>\n\n";
                const medals = ["🥇", "🥈", "🥉"]; // 金银铜牌
                let rankEmoji;
        
                results.forEach((row, index) => {
                    if (index === 9) rankEmoji = `1️⃣0️⃣`; // 第 10 名
                    else rankEmoji = index < 3 ? medals[index] : `${index + 1}️⃣`; // 前3用奖牌，其他用数字
        
                    leaderboardText += `${rankEmoji} <b>${restoreName(row.nick_name)}</b> - 邀请 <code>${row.invite_count}</code> 人\n`;
                });
        
                // **查询当前用户的排名**
                queryDatabase(
                    `SELECT COUNT(*) AS user_rank   
                     FROM sese_user 
                     WHERE invite_count > (SELECT invite_count FROM sese_user WHERE user_id = ?)`,
                    [callbackQuery.from.id],
                    (userRankResults, err) => {
                        if (err) {
                            console.error("查询用户排名出错:", err);
                        } else if (userRankResults.length > 0) {
                            const userRank = userRankResults[0].user_rank  + 1; // 排名从 1 开始
                            leaderboardText += `\n👤 <b>您的当前排名：</b> <code>#${userRank}</code>\n`;
                        }
        
                        leaderboardText += "\n🔥 <b>邀请越多，奖励越大！冲刺 USDT 大奖！</b>";
        
                        bot.editMessageText(
                            leaderboardText,
                            {
                                chat_id: callbackQuery.message.chat.id,
                                message_id: callbackQuery.message.message_id,
                                parse_mode: "HTML",
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: "💌 邀请好友", callback_data: "invite" }, { text: "🏆 邀请排行", callback_data: "leaderboard" }],
                                    ]
                                },
                            }
                        );
                    }
                );
            }
        );
      }
      if (data === "change_video") {
        const queryLastView = `SELECT created_at FROM sese_view_list WHERE telegram_id = ? ORDER BY created_at DESC LIMIT 1`;
    
        queryDatabase(queryLastView, [chatId], (results, err) => {
            if (err || results.length === 0) {
                console.error("查询观看时间失败:", err);
                return bot.answerCallbackQuery(callbackQuery.id, { text: "❌ 查询失败，请稍后重试。", show_alert: true });
            }
    
            const lastViewTime = new Date(results[0].created_at).getTime();
            const now = Date.now();
            const diffMinutes = (now - lastViewTime) / 1000 / 60; // 转成分钟
    
            if (diffMinutes > 2) {
                const deductPointsQuery = `UPDATE sese_user SET balance = balance - 1 WHERE user_id = ? AND balance > 0`;
    
                queryDatabase(deductPointsQuery, [chatId], (updateResults, updateErr) => {
                    if (updateErr) {
                        console.error("扣除积分失败:", updateErr);
                        return bot.answerCallbackQuery(callbackQuery.id, { text: "❌ 扣分失败，请稍后重试。", show_alert: true });
                    }
                    bot.answerCallbackQuery(callbackQuery.id, { text: "⚠️ 观看时间超过2分钟，扣除1积分！" });
    
                    // 继续换视频
                    editRandomVideo(chatId, msg.message_id);
                });
            } else {
                bot.answerCallbackQuery(callbackQuery.id, { text: "✅ 观看时间不超过2分钟，免费更换！" });
    
                editRandomVideo(chatId, msg.message_id);
            }
        });
    }
    
      if (data.startsWith("select_category:")) {
        const selectedCategory = data.split(":")[1];
        const telegramId = callbackQuery.from.id;
    
        // 更新用户的 `current_category`
        const updateCategoryQuery = `UPDATE sese_user SET current_category = ? WHERE user_id = ?`;
        queryDatabase(updateCategoryQuery, [selectedCategory, telegramId], (updateResult, updateErr) => {
            if (updateErr) {
                console.error("更新用户视频类型失败:", updateErr);
                return bot.answerCallbackQuery(callbackQuery.id, { text: "❌ 更新失败，请稍后重试。", show_alert: true });
            }
    
            // 查询今日观看和累计观看
            const queryUserStats = `
                SELECT 
                    (SELECT COUNT(*) FROM sese_view_list WHERE telegram_id = ? AND DATE(created_at) = CURDATE()) AS today_views,
                    (SELECT COUNT(*) FROM sese_view_list WHERE telegram_id = ?) AS total_views,
                    (SELECT COUNT(*) FROM sese_video WHERE user_id = ? AND status = 'approved') AS total_uploads
            `;
            queryDatabase(queryUserStats, [telegramId, telegramId, telegramId], (userStats, statsErr) => {
                if (statsErr || userStats.length === 0) {
                    console.error("查询观看数据错误:", statsErr);
                    return bot.sendMessage(telegramId, "❌ 查询观看数据失败，请稍后重试。");
                }
    
                const { today_views, total_views, total_uploads } = userStats[0];
    
                // 查询所有视频标题
                const queryCategories = `SELECT DISTINCT category FROM sese_video WHERE status = 'approved'`;
                queryDatabase(queryCategories, [], (categories, catErr) => {
                    if (catErr) {
                        console.error("查询标题错误:", catErr);
                        return bot.sendMessage(telegramId, "❌ 获取视频标题失败，请稍后重试。");
                    }
    
                    let inline_keyboard = [[
                        {
                            text: (selectedCategory === "默认" ? '✅ ' : '') + "默认",
                            callback_data: "select_category:默认"
                        },
                        ...(selectedCategory !== "默认" ? [{
                            text: '✅ ' + selectedCategory,
                            callback_data: `select_category:${selectedCategory}`
                        }] : [])
                    ]];
                    const messageText = `<b>📊 我的数据：</b>\n\n` +
                    `📅 今日观看：<code>${today_views}</code> 部\n` +
                    `📺 累计观看：<code>${total_views}</code> 部\n` +
                    `📤 投稿数量：<code>${total_uploads}</code> 部\n\n` +
                    `🔍 发送视频标题名称，即可切换标题并获取推荐视频！`;
                    // 更新消息
                    bot.editMessageText(
                        messageText, {
                            chat_id: callbackQuery.message.chat.id,
                            message_id: callbackQuery.message.message_id,
                            parse_mode: "HTML",
                            reply_markup: { inline_keyboard }
                        });
    
                    bot.answerCallbackQuery(callbackQuery.id, { text: `✅ 已切换到 ${selectedCategory}` });
                });
            });
        });
    }
    
    
      if (data==="invite") {
        var messageButton = conf.messageButton
        messageButton[0][1]['callback_data'] ='more'
        queryDatabase(
          `SELECT * FROM sese_user WHERE user_id = ?`,
          [callbackQuery.message.chat.id],
          (results, error) => {
              if (error) {
                  console.error("数据库查询失败:", error.message);
                  return;
              }
              if (results.length>0) {
                bot.editMessageText(
                  `💰 <b>您的余额：</b> <code>${results[0].balance}</code> 积分\n\n 🔗 <b>专属邀请链接（👇点击复制）：</b>\n <code>https://t.me/${botUsername}?start=${callbackQuery.message.chat.id}</code>\n\n 🎁 <b>邀请好友赚积分！</b>\n前 100 名都有 USDT 奖励，前 30 名更可获得高额奖励！\n 每成功邀请 <code>1</code> 名有效用户，即可 <b>立得</b> <code>${conf.inviterAmount}</code> 积分，邀请越多，赚得越多！`, 
                  {
                      chat_id: callbackQuery.message.chat.id,
                      message_id: callbackQuery.message.message_id,
                      disable_web_page_preview: true,
                      parse_mode: "HTML",
                      reply_markup: {
                          inline_keyboard: conf.messageButton
                      },
                  }
                )
              }
        })
        
      }
  });

  
    bot.on("error",(error) =>{
        console.log(error);
    })
  })
}
function removeEmojis(text) {
    return text.replace(/[\u{1F300}-\u{1FAD6}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
}
function editRandomVideo(chatId, messageId) {
    queryDatabase(`SELECT current_category FROM sese_user WHERE user_id = ?`, [chatId], (results, err) => {
        if (err || results.length === 0) {
            console.error("查询用户标题失败:", err);
            return bot.sendMessage(chatId, "❌ 获取标题失败，请稍后重试。");
        }

        const currentCategory = results[0].current_category;

        const videoQuery = currentCategory === "默认"
            ? `SELECT * FROM sese_video WHERE status = 'approved' ORDER BY RAND() LIMIT 1;`
            : `SELECT * FROM sese_video WHERE category LIKE ? AND status = 'approved' ORDER BY RAND() LIMIT 1;`;

        const queryParams = currentCategory === "默认" ? [] : [`%${currentCategory}%`];

        queryDatabase(videoQuery, queryParams, (videoResults, videoErr) => {
            if (videoErr || videoResults.length === 0) {
                console.error("查询视频失败:", videoErr);
                return bot.sendMessage(chatId, "❌ 没有找到可用的视频，发送 <code>默认</code> 恢复！", { parse_mode: "HTML" });
            }

            const video = videoResults[0];

            queryDatabase(`SELECT * FROM sese_user WHERE user_id = ?;`, [video.user_id], (userResults, userErr) => {
                if (userErr || userResults.length === 0) {
                    console.error("查询视频上传用户失败:", userErr);
                    return;
                }

                const uploader = userResults[0].user_name!="无"
                    ? `<a href="https://t.me/${userResults[0].user_name}">${restoreName(userResults[0].nick_name)}</a>`
                    : restoreName(userResults[0].nick_name);

                const caption = `🎬 <b>投稿：</b>${uploader}\n📌 <b>标题：</b>${video.category}`;

                bot.editMessageMedia(
                    {
                        type: "video",
                        media: video.video_id,
                        caption: caption,
                        parse_mode: "HTML"
                    },
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: conf.videoButton }
                    }
                ).catch(err => {
                    console.error("编辑视频失败:", err);
                    bot.sendMessage(chatId, "❌ 更换视频失败，请稍后重试。");
                });

                // 记录观看数据
                queryDatabase(
                    `INSERT INTO sese_view_list (telegram_id, video_id, message_id) VALUES (?, ?, ?);`,
                    [chatId, video.video_id, messageId],
                    (insertResults, insertErr) => {
                        if (insertErr) {
                            console.error("记录视频失败:", insertErr);
                        }
                    }
                );
            });
        });
    });
}

function sendRandomVideo(chatId,messageId) {
    queryDatabase(`SELECT current_category FROM sese_user WHERE user_id = ?`, [chatId], (results, err) => {
        if (err || results.length === 0) {
            console.error("查询用户标题失败:", err);
            return bot.sendMessage(chatId, "❌ 获取标题失败，请稍后重试。");
        }

        const currentCategory = results[0].current_category || "默认";

        const videoQuery = currentCategory === "默认"
            ? `SELECT * FROM sese_video WHERE status = 'approved' ORDER BY RAND() LIMIT 1;`
            : `SELECT * FROM sese_video WHERE category LIKE ? AND status = 'approved' ORDER BY RAND() LIMIT 1;`;

        const queryParams = currentCategory === "默认" ? [] : [`%${currentCategory}%`];

        queryDatabase(videoQuery, queryParams, (videoResults, videoErr) => {
            if (videoErr || videoResults.length === 0) {
                console.error("查询视频失败:", videoErr);
                return bot.sendMessage(chatId, "❌ 没有找到可用的视频，发送 <code>默认</code> 恢复！", { parse_mode: "HTML" });
            }

            const video = videoResults[0];

            // 查询上传者信息
            queryDatabase(`SELECT * FROM sese_user WHERE user_id = ?;`, [video.user_id], (userResults, userErr) => {
                if (userErr || userResults.length === 0) {
                    console.error("查询视频上传用户失败:", userErr);
                    return;
                }

                const uploader = userResults[0].user_name!="无"
                    ? `<a href="https://t.me/${userResults[0].user_name}">${restoreName(userResults[0].nick_name)}</a>`
                    : restoreName(userResults[0].nick_name);

                const caption = `🎬 <b>投稿：</b>${uploader}\n📌 <b>标题：</b>${video.category}`;

                bot.sendVideo(chatId, video.video_id, {
                    caption: caption,
                    parse_mode: "HTML",
                    reply_markup: { inline_keyboard: conf.videoButton }
                });

                // 记录观看数据
                queryDatabase(`INSERT INTO sese_view_list (telegram_id, video_id,message_id) VALUES (?, ?, ?);`, [chatId, video.video_id,messageId], (insertResults, insertErr) => {
                    if (insertErr) {
                        console.error("记录视频失败:", insertErr);
                    }
                });
            });
        });
    });
}



function sanitizeName(msg) {
  const firstName = msg.from.first_name || ""; 
  const lastName = msg.from.last_name || ""; 
  const fullName = firstName + lastName; 

  // 过滤并转换 Emoji
  const sanitizedName = fullName.replace(/[\p{Emoji}\p{Extended_Pictographic}]/gu, (match) => {
      return `:u+${match.codePointAt(0).toString(16).toUpperCase()}:`; // 转换成 Unicode 代码
  });

  return sanitizedName;
}

function restoreName(sanitizedName) {
  return sanitizedName.replace(/:u\+([0-9A-F]+):/g, (match, unicode) => {
      return String.fromCodePoint(parseInt(unicode, 16)); // 转回 Emoji
  });
}
// 启动程序
startBot();

