import {showLoading,hideLoading} from './loading.js';
showLoading(10,'Loading game engine and interface…');
const moduleLoad=new URLSearchParams(location.search).has('lab')?import('./main.js'):import('./arena.js');
void moduleLoad.then(()=>hideLoading()).catch(()=>showLoading(10,'Loading failed. Please reload to retry.'));
