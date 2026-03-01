import type { ChannelKey } from '@/types/translate';
import type { TextPair } from '@/lib/ocr-translate';
import type { QueryTaskResult } from './volcengine';
import { volcengineSubmitTask, volcengineQueryTask } from './volcengine';

/**
 * 提交图生图任务，返回 task_id。
 */
export async function dispatchSubmitTask(
  channel: ChannelKey,
  base64: string,
  pairs: TextPair[],
  targetLang: string
): Promise<string> {
  switch (channel) {
    case 'volcengine': {
      const { taskId } = await volcengineSubmitTask(base64, pairs, targetLang);
      return taskId;
    }
    default:
      throw new Error(`未知渠道：${channel}`);
  }
}

/**
 * 查询异步任务状态和结果。
 */
export async function dispatchQueryTask(
  channel: ChannelKey,
  taskId: string
): Promise<QueryTaskResult> {
  switch (channel) {
    case 'volcengine':
      return volcengineQueryTask(taskId);
    default:
      throw new Error(`未知渠道：${channel}`);
  }
}
