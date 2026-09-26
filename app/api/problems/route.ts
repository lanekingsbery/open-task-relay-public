import {response} from '@/lib/commons';
import {retiredTaskSubmission,publicTaskSubmissionCode} from '@/lib/task-submission';
export const GET=()=>response({data:{task_creation_enabled:false,code:publicTaskSubmissionCode,tasks_url:'/tasks'}});
export const POST=retiredTaskSubmission;
