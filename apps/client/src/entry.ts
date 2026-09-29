import {showLoading,hideLoading,showLoadingError} from './loading.js';
showLoading(10,'Loading game engine and interface…');
const moduleLoad=new URLSearchParams(location.search).has('lab')?import('./main.js'):import('./arena.js');
void moduleLoad.then(()=>hideLoading()).catch(error=>{console.error('Market Captains startup failed:',error);showLoadingError();});
