/* Demo architecture used by the dependency graph. Every figure is sample data. */
export const NODES: any =[
 {id:'j-checkout',label:'Checkout',kind:'journey',x:84,y:150,sub:'customer journey'},
 {id:'j-renew',label:'Renewals',kind:'journey',x:84,y:360,sub:'customer journey'},
 {id:'web',label:'web-storefront',kind:'service',x:250,y:70,sub:'Next.js · Vercel',owner:'Web',rev:'r-2291'},
 {id:'checkout',label:'checkout-service',kind:'service',x:250,y:230,sub:'Node · Vercel',owner:'Commerce',rev:'r-1840'},
 {id:'recs',label:'recommendations',kind:'service',x:250,y:420,sub:'Python · Vercel',owner:'Growth',rev:'r-0771'},
 {id:'payment',label:'payment-service',kind:'service',x:450,y:130,sub:'Node · Vercel',owner:'Payments',rev:'a3f9c1e'},
 {id:'inventory',label:'inventory-service',kind:'service',x:450,y:270,sub:'Go · Vercel',owner:'Fulfilment',rev:'e07b44d'},
 {id:'order',label:'order-service',kind:'service',x:450,y:390,sub:'Node · Vercel',owner:'Commerce',rev:'c91d20a'},
 {id:'notif',label:'notification-svc',kind:'service',x:450,y:490,sub:'Python · Vercel Cron',owner:'Growth',rev:'n-0418'},
 {id:'paygate',label:'PayGate API',kind:'resource',x:660,y:60,sub:'external provider'},
 {id:'redis',label:'redis-sessions',kind:'resource',x:660,y:170,sub:'Redis (managed)'},
 {id:'pginv',label:'pg-inventory',kind:'resource',x:660,y:285,sub:'Postgres (managed)'},
 {id:'pgord',label:'pg-orders',kind:'resource',x:660,y:385,sub:'Postgres (managed)'},
 {id:'kafka',label:'order-events',kind:'resource',x:660,y:485,sub:'Queue topic'}
];
export const EDGES: any =[
 ['j-checkout','web','observed',0,'page render'],['j-checkout','checkout','observed',1,'POST /checkout'],
 ['j-renew','payment','observed',1,'renew charge'],['j-renew','order','observed',1,'renew order'],
 ['web','checkout','observed',1,'sync API · 3s timeout'],
 ['checkout','payment','observed',1,'authorize_payment · timeout 2000 ms'],['checkout','inventory','observed',1,'reserve_stock · timeout 1500 ms'],
 ['checkout','order','observed',1,'create_order · timeout 2500 ms'],['checkout','recs','declared',0,'optional · fallback: none shown'],
 ['payment','paygate','observed',1,'HTTPS authorize · timeout from PAYMENT_TIMEOUT_MS'],['payment','redis','observed',0,'idempotency keys'],
 ['inventory','pginv','observed',1,'SQL reads/writes'],['inventory','redis','inferred',0,'inferred from code import'],
 ['order','pgord','observed',1,'SQL reads/writes'],['order','kafka','observed',0,'async publish'],['kafka','notif','observed',0,'async consume']
];
export const ZONE: any ={x:358,y:88,w:184,h:226,label:'fra1 · vercel-prod'};
export const SERVICE_INFO: any ={
 payment:{slo:'99.9% authorize success',deploy:'#185 · 11:58 UTC',cfg:'PAYMENT_TIMEOUT_MS = 800'},
 checkout:{slo:'99.5% checkout success',deploy:'#183 · yesterday',cfg:'UPSTREAM_TIMEOUT_MS = 3000'},
 inventory:{slo:'99.9% reserve success',deploy:'#41 · 3 days ago',cfg:'DB_POOL_MAX = 40'},
 order:{slo:'99.5% order create',deploy:'#188 · 13:58 UTC',cfg:'EMAIL_TEMPLATE = v7'}
};
