const assets=import.meta.glob('./assets/captains/*.png',{eager:true,query:'?inline',import:'default'}) as Record<string,string>;
export const PORTRAITS=Array.from({length:10},(_,i)=>assets[`./assets/captains/captain-${i}.png`]!);

