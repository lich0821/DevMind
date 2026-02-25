---
description: 同步团队记忆（git pull + 重建索引 + 冲突检测）
---

执行 **SYNC-MEMORY**——同步团队记忆。

## 执行步骤

### 步骤1：拉取最新变更

```sh
git pull origin main
```

如果失败（冲突或网络问题），停止并提示开发者手动处理。

### 步骤2：检查 memory/ 冲突

```sh
git status | grep "memory/"
```

如果有冲突文件，输出：
```
⚠️ 发现 memory/ 目录下有合并冲突：
- [冲突文件列表]

请手动解决冲突后，重新运行 /dm:sync-memory
```

### 步骤3：重建索引

```sh
.devmind/scripts/rebuild-index.sh
```

### 步骤4：输出同步摘要

```
同步完成：
- 拉取了 N 个新提交
- memory/ 新增/修改了 M 个文件
- 索引已更新：X 条 Decisions，Y 条 Patterns，Z 条 Graveyard
```

## 注意

个人使用时，直接运行 `.devmind/scripts/rebuild-index.sh` 即可，无需 git pull。
