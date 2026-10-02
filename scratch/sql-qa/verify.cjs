const {PGlite}=require('@electric-sql/pglite');const fs=require('fs');const assert=require('node:assert/strict');
(async()=>{const db=new PGlite();await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE TABLE profiles(id uuid PRIMARY KEY,subscription_plan text,subscription_ends_at timestamptz);
CREATE TABLE payments(id uuid PRIMARY KEY,member_id uuid REFERENCES profiles(id),paymongo_session_id text UNIQUE,type text,amount integer,status text,plan_id text,paid_at timestamptz);
CREATE TABLE ad_credit_ledger(member_id uuid REFERENCES profiles(id),change_amount integer,reason text);
`);await db.exec(fs.readFileSync('supabase/migrations/20261003000200_payment_fulfillment.sql','utf8'));
const uid='11111111-1111-1111-1111-111111111111';await db.query('INSERT INTO profiles(id) VALUES($1)',[uid]);
async function payment(id,session,type,credits=100,months=null){await db.query('INSERT INTO payments(id,member_id,paymongo_session_id,type,amount,status,granted_credits,subscription_months,purchase_label,plan_id) VALUES($1,$2,$3,$4,5600,\'pending\',$5,$6,\'Test purchase\',\'6mo\')',[id,uid,session,type,credits,months]);}
async function fulfill(session,amount=5600,member=uid){return db.query('SELECT fulfill_checkout_payment($1,$2,$3) AS fulfilled',[session,amount,member]);}
await payment('22222222-2222-2222-2222-222222222222','cs_one','credits');
await assert.rejects(fulfill('cs_one',1));await assert.rejects(fulfill('cs_one',5600,'someone-else'));
assert.equal((await fulfill('cs_one')).rows[0].fulfilled,true);assert.equal((await fulfill('cs_one')).rows[0].fulfilled,false);
assert.equal((await db.query('SELECT count(*)::integer AS n FROM ad_credit_ledger')).rows[0].n,1);
await payment('33333333-3333-3333-3333-333333333333','cs_plan','subscription',0,6);await fulfill('cs_plan');
assert.equal((await db.query('SELECT subscription_plan FROM profiles')).rows[0].subscription_plan,'6mo');
const expiry=(await db.query('SELECT subscription_ends_at FROM profiles')).rows[0].subscription_ends_at;
await fulfill('cs_plan');assert.equal(String((await db.query('SELECT subscription_ends_at FROM profiles')).rows[0].subscription_ends_at),String(expiry));
await payment('44444444-4444-4444-4444-444444444444','cs_retry','credits');
const retried=await Promise.all([fulfill('cs_retry'),fulfill('cs_retry')]);assert.deepEqual(retried.map(x=>x.rows[0].fulfilled).sort(),[false,true]);
await db.exec("CREATE FUNCTION fail_ledger() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Ledger unavailable'; END; $$; CREATE TRIGGER ledger_failure BEFORE INSERT ON ad_credit_ledger FOR EACH ROW EXECUTE FUNCTION fail_ledger();");
await payment('55555555-5555-5555-5555-555555555555','cs_failure','credits');await assert.rejects(fulfill('cs_failure'));
assert.equal((await db.query("SELECT status FROM payments WHERE paymongo_session_id='cs_failure'")).rows[0].status,'pending');
await db.exec('DROP TRIGGER ledger_failure ON ad_credit_ledger');await fulfill('cs_failure');
const privileges=await db.query("SELECT has_function_privilege('authenticated','fulfill_checkout_payment(text,integer,text)','execute') AS member,has_function_privilege('service_role','fulfill_checkout_payment(text,integer,text)','execute') AS service");assert.deepEqual(privileges.rows[0],{member:false,service:true});
console.log('PASS: payment SQL validates amount/owner, grants once on retry, extends subscription once, rolls back failed ledger writes, and restricts fulfillment to service_role.');await db.close();})().catch(e=>{console.error(e.message);process.exit(1)});
