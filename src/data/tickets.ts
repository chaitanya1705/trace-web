import { pick, rng } from "@/lib/util";

/* Org-wide ticket list (generated with a fixed seed). Sample data only. */
export const PROJECTS: string[] = ['Storefront', 'Payments', 'Fulfilment'];
export const ENVS: string[] = ['production', 'uat', 'staging', 'dev'];

export const INC_ALL: any[] =(()=>{const base=[
 ['INC-2417','Payment authorizations failing at checkout','Payments','production','SEV-1','Investigating','Supported','good','Config','Priya S.',1,0],
 ['INC-2420','Inventory reservations timing out','Fulfilment','production','SEV-2','Waiting on people','Plausible','warn','Infra','Marcus L.',2,1],
 ['INC-2416','Staging login loop after release candidate','Storefront','staging','SEV-3','Fix proposed','Supported','good','Code','Ana R.',0,2],
 ['INC-2415','Order confirmation emails delayed','Fulfilment','production','SEV-3','Resolved','Supported','good','Config','Ana R.',0,26],
 ['INC-2411','Recommendations API intermittently 500','Storefront','production','SEV-3','Resolved','Insufficient evidence','ins','Unknown','Ken T.',0,50],
 ['INC-2409','Session cache evictions spike','Payments','production','SEV-3','Closed','Supported','good','Infra','Priya S.',0,74],
 ['INC-2402','Storefront 502s after deploy','Storefront','production','SEV-2','Closed','Supported','good','Code','Marcus L.',0,120]];
 const T=['Checkout latency spike','Login failures after deploy','Webhook retries piling up','Search index stale','Cart totals mismatch','Image resize timeouts','Refund job failing','Inventory sync lag','Email bounce spike','Memory growth in worker','Cache stampede on product page','Cron job overlapping','Payment webhook signature mismatch','Slow report export','Duplicate order events','Rate limit hit on provider API'];
 const P={Storefront:['web-storefront','recommendations'],Payments:['payment-service','refund-service'],Fulfilment:['inventory-service','order-service']};
 const r=rng(42),own=['Priya S.','Marcus L.','Ana R.','Ken T.','Lee K.'],C=['Code','Config','Infra','External','Data','Unknown'],out=[];
 base.forEach(b=>out.push({id:b[0],title:b[1],project:b[2],env:b[3],sev:b[4],status:b[5],finding:b[6],cls:b[7],cause:b[8],owner:b[9],waiting:b[10],age:b[11],svc:P[b[2]][0]}));
 for(let i=0;i<141;i++){const pr=pick(r,PROJECTS),st=r()<.08?'Fix proposed':r()<.55?'Resolved':'Closed',fnd=r()<.12?['Insufficient evidence','ins']:r()<.2?['Plausible','warn']:['Supported','good'];
  out.push({id:'INC-'+(2401-i-1),title:pick(r,T),project:pr,env:r()<.62?'production':pick(r,['uat','staging','dev']),sev:pick(r,['SEV-2','SEV-3','SEV-3','SEV-4']),status:st,finding:fnd[0],cls:fnd[1],cause:pick(r,C),owner:pick(r,own),waiting:0,age:150+i*9,svc:pick(r,P[pr])})}
 return out})();

/* Two tickets that arrive with no project yet (the Tickets screen asks you to assign them). */
INC_ALL.unshift(
  { id: "INC-2423", title: "Webhook deliveries failing intermittently", project: "", env: "production", sev: "SEV-3", status: "New", finding: "None yet", cls: "ins", cause: "Unknown", owner: "Unassigned", waiting: 0, age: 3, svc: "webhook-receiver" },
  { id: "INC-2422", title: "Login latency spike after 22:00", project: "", env: "production", sev: "SEV-2", status: "New", finding: "None yet", cls: "ins", cause: "Unknown", owner: "Unassigned", waiting: 0, age: 9, svc: "auth-api" },
);
