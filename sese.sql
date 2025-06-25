-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- 主机： localhost
-- 生成日期： 2025-06-25 10:56:58
-- 服务器版本： 8.0.24
-- PHP 版本： 8.0.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- 数据库： `game`
--

-- --------------------------------------------------------

--
-- 表的结构 `config`
--

CREATE TABLE `config` (
  `Id` int NOT NULL,
  `value` varchar(255) DEFAULT NULL,
  `value2` varchar(255) DEFAULT NULL,
  `value3` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL COMMENT '描述'
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3;

--
-- 转存表中的数据 `config`
--

INSERT INTO `config` (`Id`, `value`, `value2`, `value3`, `type`, `description`) VALUES
(1, '', NULL, NULL, 'tg_admin_groupid', '电报管理群id'),
(2, '', '', '', 'sese_bot_token', '色色机器人配置');

-- --------------------------------------------------------

--
-- 表的结构 `invite`
--

CREATE TABLE `invite` (
  `Id` int NOT NULL,
  `inviter` varchar(255) DEFAULT NULL,
  `phonenumber` varchar(255) DEFAULT NULL,
  `invite_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `success_time` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `is_active` varchar(255) DEFAULT '注册成功',
  `amount` double(11,2) DEFAULT '0.00'
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3;


-- --------------------------------------------------------

--
-- 表的结构 `sese_user`
--

CREATE TABLE `sese_user` (
  `id` int NOT NULL,
  `user_id` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `nick_name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `user_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `balance` int NOT NULL,
  `current_category` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '默认',
  `inviter` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'system',
  `invite_count` int NOT NULL DEFAULT '0',
  `created_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- 表的结构 `sese_video`
--

CREATE TABLE `sese_video` (
  `id` int NOT NULL,
  `video_id` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `user_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `category` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('pending','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'approved',
  `group_id` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- 表的结构 `sese_view_list`
--

CREATE TABLE `sese_view_list` (
  `id` int NOT NULL,
  `telegram_id` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `video_id` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `message_id` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- 转储表的索引
--

--
-- 表的索引 `config`
--
ALTER TABLE `config`
  ADD PRIMARY KEY (`Id`);

--
-- 表的索引 `invite`
--
ALTER TABLE `invite`
  ADD PRIMARY KEY (`Id`);

--
-- 表的索引 `sese_user`
--
ALTER TABLE `sese_user`
  ADD PRIMARY KEY (`id`);

--
-- 表的索引 `sese_video`
--
ALTER TABLE `sese_video`
  ADD PRIMARY KEY (`id`);

--
-- 表的索引 `sese_view_list`
--
ALTER TABLE `sese_view_list`
  ADD PRIMARY KEY (`id`);

--
-- 在导出的表使用AUTO_INCREMENT
--

--
-- 使用表AUTO_INCREMENT `config`
--
ALTER TABLE `config`
  MODIFY `Id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- 使用表AUTO_INCREMENT `invite`
--
ALTER TABLE `invite`
  MODIFY `Id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- 使用表AUTO_INCREMENT `sese_user`
--
ALTER TABLE `sese_user`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `sese_video`
--
ALTER TABLE `sese_video`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `sese_view_list`
--
ALTER TABLE `sese_view_list`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
