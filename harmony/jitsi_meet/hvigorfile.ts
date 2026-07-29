/*
 * Copyright (c) 2025 Huawei Device Co., Ltd. All rights reserved
 * Use of this source code is governed by a MIT license that can be
 * found in the LICENSE file.
 */

import { harTasks, OhosHapContext, OhosPluginId } from '@ohos/hvigor-ohos-plugin';
import { hvigor, HvigorNode, HvigorPlugin } from '@ohos/hvigor';
import fs from 'fs';
import path from 'path';

export function jitsiMeetPlugin(libPath?: string, rawFilePath?: string): HvigorPlugin {
  return {
    pluginId: 'opSqlitePluginId',
    apply(node: HvigorNode) {
      // 缺少参数时不执行拷贝，避免误删 rawfile 目录。
      if (!libPath || !rawFilePath) {
        hvigor.logger.warn(
          'jitsiMeetPlugin: libPath 或 rawFilePath 未传入，跳过目录拷贝。'
        );
        return;
      }

      // 相对路径以模块根目录（hvigorfile.ts 所在目录）为基准解析。
      const moduleDir = node.modulePath;
      const resolvePath = (p: string) =>
        path.isAbsolute(p) ? p : path.resolve(moduleDir, p);
      const src = resolvePath(libPath);
      const dest = resolvePath(rawFilePath);

      if (!fs.existsSync(src)) {
        throw new Error(`jitsiMeetPlugin: 源目录不存在: ${src}`);
      }
      if (!fs.statSync(src).isDirectory()) {
        throw new Error(`jitsiMeetPlugin: libPath 必须是目录: ${src}`);
      }

      // 目标已存在先删除，保证多次构建结果幂等、不留旧文件。
      if (fs.existsSync(dest)) {
        fs.rmSync(dest, { recursive: true, force: true });
      }
      fs.mkdirSync(dest, { recursive: true });

      // 递归拷贝整个目录树（force 覆盖同名，递归子目录）。
      fs.cpSync(src, dest, { recursive: true, force: true });

      hvigor.logger.info(`jitsiMeetPlugin: 已拷贝 ${src} -> ${dest}`);
    }
  };
}

export default {
  system: harTasks,
  plugins: []
}
