import {ApiError,errorResponse} from './commons.ts';
export const publicTaskSubmissionCode='PUBLIC_TASK_SUBMISSION_DISABLED';
export function rejectPublicTaskSubmission():never{
 throw new ApiError(410,publicTaskSubmissionCode,'Public task creation is retired. Continue an existing curated task at /tasks.');
}
export function isTaskCreation(path:string[]){
 return path[0]==='problems'||path[0]==='tasks'&&(!path[1]||path[2]==='subtasks');
}
export function retiredTaskSubmission(){
 try{rejectPublicTaskSubmission()}catch(e){return errorResponse(e)}
}
