-- Listes de référence : catégories, événements, styles (taxonomie boutique).
-- Idempotent : rejouable sans erreur (garde WHERE NOT EXISTS par ligne).
-- Ces lignes existaient en base (créées au dashboard) ; les figer ici les
-- versionne (protocole §10) et sert de source au garde tests/taxonomy-guard.
-- Labels FR/EN + emojis : éditables admin (le front les affiche tels quels).
-- Keywords : auto-suggestion à l'import (form) + défauts sync (classify.ts).

-- ── category ──
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'category-hat', 'category', 'hat', 'hat', array['cap','hat'], 0
where not exists (select 1 from reference_lists where type = 'category' and value = 'hat');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'category-tshirt', 'category', 'tshirt', 'T-Shirt', array['t-shirt','tshirt','t shirt','tee','chemise','tank','top'], 1
where not exists (select 1 from reference_lists where type = 'category' and value = 'tshirt');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'category-hoodie', 'category', 'hoodie', 'Hoodie', array['hoodie','sweatshirt','sweat','pull','hood'], 2
where not exists (select 1 from reference_lists where type = 'category' and value = 'hoodie');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'category-accessory', 'category', 'accessory', 'Accessoire', array['hat','cap','casquette','chapeau','bag','sac','legging','short','pant','pantalon','sock','chaussette'], 3
where not exists (select 1 from reference_lists where type = 'category' and value = 'accessory');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'category-mug', 'category', 'mug', 'Mug', array['mug','tasse'], 4
where not exists (select 1 from reference_lists where type = 'category' and value = 'mug');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'category-case', 'category', 'case', 'Case / Coque', array['phone case','iphone case','samsung case','coque','case','phone'], 5
where not exists (select 1 from reference_lists where type = 'category' and value = 'case');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'category-sticker', 'category', 'sticker', 'Sticker', array['sticker','autocollant'], 6
where not exists (select 1 from reference_lists where type = 'category' and value = 'sticker');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'category-poster', 'category', 'poster', 'Poster', array['poster','affiche','print'], 7
where not exists (select 1 from reference_lists where type = 'category' and value = 'poster');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'category-canvas', 'category', 'canvas', 'Canvas', array['canvas','toile','tableau'], 8
where not exists (select 1 from reference_lists where type = 'category' and value = 'canvas');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'category-other', 'category', 'other', 'Autre', array[]::text[], 9
where not exists (select 1 from reference_lists where type = 'category' and value = 'other');

-- ── event_type ──
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'event-worldcup', 'event_type', 'worldcup', '⚽ World Cup / Soccer', array['world cup','soccer','football','fifa','goal','penalty','the world''s game','futbol'], 0
where not exists (select 1 from reference_lists where type = 'event_type' and value = 'worldcup');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'event-discount', 'event_type', 'discount', 'Discount 🔥', array['discount','promo','promotion','sale','solde','offre','deal'], 0
where not exists (select 1 from reference_lists where type = 'event_type' and value = 'discount');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'event-birthday', 'event_type', 'birthday', '🎂 Birthday', array['birthday','bday','happy birthday','milestone','21st','30th','40th','50th','60th','70th','80th','birthday squad','born','birthday shirt'], 0
where not exists (select 1 from reference_lists where type = 'event_type' and value = 'birthday');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'event-halloween', 'event_type', 'halloween', '🎃 Halloween', array['halloween','spooky','october 31','trick or treat','pumpkin','ghost','witch','horror','scary','halloween party'], 0
where not exists (select 1 from reference_lists where type = 'event_type' and value = 'halloween');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'event-christmas', 'event_type', 'christmas', '🎄 Christmas', array['christmas','xmas','holiday','merry christmas','santa','reindeer','snowman','ugly sweater','family christmas','jingle'], 0
where not exists (select 1 from reference_lists where type = 'event_type' and value = 'christmas');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'event-valentines', 'event_type', 'valentines', '💕 Valentine''s Day', array['valentines','valentine''s','love','feb 14','february 14','be mine','heart','cupid','couples','romantic','galentines'], 0
where not exists (select 1 from reference_lists where type = 'event_type' and value = 'valentines');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'event-newyear', 'event_type', 'newyear', '🎆 New Year''s Eve', array['new year','nye','2026','2027','countdown','party','resolutions','cheers','midnight'], 0
where not exists (select 1 from reference_lists where type = 'event_type' and value = 'newyear');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'event-musicfestival', 'event_type', 'musicfestival', '🎵 Music Festival', array['music festival','coachella','lollapalooza','rave','edm','concert','festival outfit','hippie','dj'], 0
where not exists (select 1 from reference_lists where type = 'event_type' and value = 'musicfestival');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'event-fourthofjuly', 'event_type', 'fourthofjuly', '🇺🇸 4th of July', array['4th of july','independence day','july 4','patriotic','america','american','usa','united states of america','fireworks','red white blue','freedom'], 0
where not exists (select 1 from reference_lists where type = 'event_type' and value = 'fourthofjuly');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'event-stpatricks', 'event_type', 'stpatricks', '🍀 St. Patrick''s Day', array['st patricks','paddy''s day','march 17','irish','lucky','shamrock','green beer','leprechaun'], 0
where not exists (select 1 from reference_lists where type = 'event_type' and value = 'stpatricks');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'event-thanksgiving', 'event_type', 'thanksgiving', '🦃 Thanksgiving', array['thanksgiving','turkey','thankful','family feast','november','grateful','harvest','gobble'], 0
where not exists (select 1 from reference_lists where type = 'event_type' and value = 'thanksgiving');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'event-biggame', 'event_type', 'biggame', '🏈 Big Game / Football Sunday', array['super bowl','football','big game','tailgate','game day','football fan','sunday','touchdown','end zone'], 0
where not exists (select 1 from reference_lists where type = 'event_type' and value = 'biggame');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'event-marchmadness', 'event_type', 'marchmadness', '🏀 March Madness', array['march madness','college basketball','bracket','hoops','tournament','buzzer beater','final four'], 0
where not exists (select 1 from reference_lists where type = 'event_type' and value = 'marchmadness');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'event-graduation', 'event_type', 'graduation', '🎓 Graduation', array['graduation','grad','cap and gown','class of','diploma','alumni','senior','graduated'], 0
where not exists (select 1 from reference_lists where type = 'event_type' and value = 'graduation');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'event-summer', 'event_type', 'summer', '☀️ Summer Vacation', array['summer','beach','vacation','sunshine','pool party','bbq','tropical','swim','tan'], 0
where not exists (select 1 from reference_lists where type = 'event_type' and value = 'summer');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'event-carnival', 'event_type', 'carnival', '🎭 Carnival / Mardi Gras', array['carnival','mardi gras','fat tuesday','parade','masquerade','beads','purple green gold','rio'], 0
where not exists (select 1 from reference_lists where type = 'event_type' and value = 'carnival');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'event-gaming', 'event_type', 'gaming', '🎮 Gaming / eSports', array['gaming','esports','twitch','streamer','gamer','console','pc','fortnite','call of duty','minecraft'], 0
where not exists (select 1 from reference_lists where type = 'event_type' and value = 'gaming');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'event-casual', 'event_type', 'casual', '👕 Casual / Everyday', array['casual','everyday','daily','basic','simple','chill','relax','weekend','streetwear','unisex','classic','minimal','timeless','wardrobe staple'], 0
where not exists (select 1 from reference_lists where type = 'event_type' and value = 'casual');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'event-sport', 'event_type', 'sport', '🏆 Sport', array['sport','football','soccer','basket','rugby','tennis','athletic','running','fitness','gym','training','marathon'], 1
where not exists (select 1 from reference_lists where type = 'event_type' and value = 'sport');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'event-saisonnier', 'event_type', 'saisonnier', '🍂 Saisonnier', array['saisonnier','seasonal','carnaval','carnival','noël','christmas','halloween','thanksgiving','summer','winter','spring','autumn'], 4
where not exists (select 1 from reference_lists where type = 'event_type' and value = 'saisonnier');

-- ── style ──
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'style-retro', 'style', 'retro', 'Retro', array['retro','vintage','old school','classic','throwback'], 1
where not exists (select 1 from reference_lists where type = 'style' and value = 'retro');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'style-cute', 'style', 'cute', 'Cute', array['cute','kawaii','adorable','mignon','funny','humor'], 2
where not exists (select 1 from reference_lists where type = 'style' and value = 'cute');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'style-street', 'style', 'street', 'Street', array['street','urban','graffiti','skate','hip hop','rap'], 3
where not exists (select 1 from reference_lists where type = 'style' and value = 'street');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'style-cozy', 'style', 'cozy', 'Cozy', array['cozy','comfort','chill','relax','home','lounge','soft'], 4
where not exists (select 1 from reference_lists where type = 'style' and value = 'cozy');
insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'style-commute', 'style', 'commute', 'Commute', array['commute','travel','transport','metro','train','bike','cyclist'], 5
where not exists (select 1 from reference_lists where type = 'style' and value = 'commute');
