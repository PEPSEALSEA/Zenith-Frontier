var SS_ID = "1UCa0n4_0cbH8ZaifYPSLpGDYPzLGI9XZG5ah5Yixg_Y";

function getDB() {
    return SpreadsheetApp.openById(SS_ID);
}

function getSheet(name) {
    return getDB().getSheetByName(name);
}

function setupAllSheets() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var schemas = {
        "Players": [
            "player_id", "name", "level", "exp", "stored_exp",
            "main_job_id", "sub_job_id", "karma", "vorpal_soul", "arcanum_id",
            "hp", "mp", "atk", "def", "spd", "appearance", "created_at"
        ],
        "Jobs": [
            "job_id", "job_name", "tier", "parent_job_id", "branch",
            "is_hidden", "unlock_condition", "stat_bonus", "description"
        ],
        "PlayerJobs": [
            "player_id", "job_id", "unlocked_at"
        ],
        "Skills": [
            "skill_id", "skill_name", "job_id", "tier", "parent_skill_id",
            "evolution_branches", "is_locked_by", "description"
        ],
        "PlayerSkills": [
            "player_id", "skill_id", "skill_level", "branch_chosen", "is_locked", "unlocked_at"
        ],
        "SkillCombos": [
            "player_id", "skill_id_1", "skill_id_2", "combo_name", "power_bonus", "created_at"
        ],
        "Equipment": [
            "item_id", "item_name", "item_type", "rarity", "tier",
            "base_stats", "is_hero_weapon", "is_legacy", "max_quantity",
            "ascension_table", "description"
        ],
        "PlayerInventory": [
            "player_id", "item_id", "quantity", "raise_level", "ascension_form", "obtained_at"
        ],
        "WorldBoss": [
            "boss_id", "boss_name", "colossus_rank", "is_alive",
            "required_scenario_key", "killer_player_id", "killed_at",
            "lore_unlocked", "lore_text"
        ],
        "Titles": [
            "title_id", "title_name", "title_type", "effect", "condition", "description"
        ],
        "PlayerTitles": [
            "player_id", "title_id", "obtained_at", "source"
        ],
        "HolderRecords": [
            "title_id", "player_id", "stat_value", "updated_at"
        ],
        "HiddenParams": [
            "player_id", "param_name", "param_value", "last_updated"
        ],
        "Arcanum": [
            "player_id", "card_id", "card_name", "positive_effect", "negative_effect",
            "is_reverse", "is_controllable", "activated", "set_at"
        ],
        "ArcanumCards": [
            "card_id", "card_name", "positive_effect", "negative_effect", "description"
        ],
        "WorldState": [
            "key", "value", "updated_at"
        ],
        "NPCStatus": [
            "npc_id", "scenario_id", "is_dead", "killed_by", "killed_at", "quest_closed"
        ],
        "MapObjects": [
            "id", "type", "x", "y", "name", "radius", "params"
        ]
    };

    var logs = [];
    for (var name in schemas) {
        var sh = ss.getSheetByName(name);
        if (!sh) {
            sh = ss.insertSheet(name);
            logs.push("Created Sheet: " + name);
        }

        var existingHeaders = sh.getLastColumn() > 0 ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
        var requiredHeaders = schemas[name];
        var missingHeaders = requiredHeaders.filter(h => existingHeaders.indexOf(h) === -1);

        if (missingHeaders.length > 0) {
            var startCol = (existingHeaders.length || 0) + 1;
            sh.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
            logs.push("Adjusted " + name + " - Added: " + missingHeaders.join(", "));
        }

        if (sh.getFrozenRows() === 0) sh.setFrozenRows(1);
    }

    var wsSheet = ss.getSheetByName("WorldState");
    if (wsSheet && wsSheet.getLastRow() < 2) {
        var defaults = [
            ["moon_phase", "full", new Date().toISOString()],
            ["mana_level", "120", new Date().toISOString()],
            ["main_story_phase", "pre_colossi", new Date().toISOString()]
        ];
        wsSheet.getRange(2, 1, defaults.length, 3).setValues(defaults);
    }

    return "Setup Complete:\n" + logs.join("\n");
}

function seedSampleData() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var jobsSheet = ss.getSheetByName("Jobs");
    if (jobsSheet && jobsSheet.getLastRow() < 2) {
        var jobs = [
            ["JOB_001", "Warrior", "low", "", "base_warrior", "0", "", "atk+10,def+5", "นักรบเริ่มต้น"],
            ["JOB_002", "Archer", "low", "", "base_archer", "0", "", "spd+10,atk+5", "นักธนูเริ่มต้น"],
            ["JOB_003", "Twin-Blade", "low", "", "base_assassin", "0", "", "spd+15,atk+3", "นักดาบคู่ผู้รวดเร็ว"],
            ["JOB_004", "Spearman", "low", "", "base_spear", "0", "", "atk+7,def+8", "พลหอกระยะกลาง"],
            ["JOB_005", "Supporter", "low", "", "base_support", "0", "", "mp+30,def+5", "สายสนับสนุนทีม"],
            ["JOB_006", "Knight", "high", "JOB_001", "tank", "0", "", "def+20,hp+50", "อัศวินนักป้องกัน"],
            ["JOB_007", "Berserker", "high", "JOB_001", "dps", "0", "", "atk+30,def-10", "นักรบคลั่ง"],
            ["JOB_008", "Mage", "low", "", "base_mage", "0", "", "mp+20,atk+5", "นักเวทย์เริ่มต้น"]
        ];
        jobsSheet.getRange(2, 1, jobs.length, 9).setValues(jobs);
    }

    var skillsSheet = ss.getSheetByName("Skills");
    if (skillsSheet && skillsSheet.getLastRow() < 2) {
        var skills = [
            ["SKL_001", "Slash", "JOB_001", "1", "", "power,speed", "", "ฟันด้วยดาบ"],
            ["SKL_002", "Heavy Blow", "JOB_001", "2", "SKL_001", "crush,stun", "", "ฟันหนักทำให้มึนงง"],
            ["SKL_003", "Blade Storm", "JOB_001", "3", "SKL_002", "wide,single", "SKL_004", "พายุดาบ - เลือก wide หรือ single target"],
            ["SKL_004", "Shield Bash", "JOB_002", "1", "", "", "", "กระแทกด้วยโล่"],
            ["SKL_005", "Arcane Bolt", "JOB_005", "1", "", "rapid,heavy", "", "ลูกศรเวทย์"]
        ];
        skillsSheet.getRange(2, 1, skills.length, 8).setValues(skills);
    }

    var bossSheet = ss.getSheetByName("WorldBoss");
    if (bossSheet && bossSheet.getLastRow() < 2) {
        var bosses = [
            ["BOSS_001", "Lycagon the Cursed", "1", "1", "SCENARIO_LYCAGON", "", "", "0", "Lycagon คือจอมอสูรผู้สาปแช่งดินแดนตะวันตก..."],
            ["BOSS_002", "Thalvros of the Deep", "2", "1", "SCENARIO_THALVROS", "", "", "0", "Thalvros หลับใหลอยู่ใต้มหาสมุทร..."],
            ["BOSS_003", "The Iron Colossus", "3", "1", "SCENARIO_IRON", "", "", "0", "หุ่นยักษ์จากยุค Magitek..."],
            ["BOSS_004", "Wraithweave", "4", "1", "SCENARIO_WRAITH", "", "", "0", "ผ้าแห่งเงามืด..."],
            ["BOSS_005", "Ashenveil", "5", "1", "SCENARIO_ASH", "", "", "0", "เถ้าถ่านแห่งการทำลายล้าง..."],
            ["BOSS_006", "Chronolith", "6", "1", "SCENARIO_CHRONO", "", "", "0", "เสาหินที่บิดเบือนกาลเวลา..."],
            ["BOSS_007", "Nullborn", "7", "1", "SCENARIO_NULL", "", "", "0", "สิ่งที่เกิดจากความว่างเปล่า..."]
        ];
        bossSheet.getRange(2, 1, bosses.length, 9).setValues(bosses);
    }

    var arcanumSheet = ss.getSheetByName("ArcanumCards");
    if (arcanumSheet && arcanumSheet.getLastRow() < 2) {
        var cards = [
            ["ARC_001", "The Tower", "atk+100%", "def-50%", "ไพ่หอคอย พลังโจมตีพุ่ง แต่รับดาเมจมากขึ้น"],
            ["ARC_002", "The Moon", "mp+200%", "vision_range-30%", "ไพ่จันทรา มานาล้นเหลือ แต่สายตาสั้นลง"],
            ["ARC_003", "The Star", "all_regen+50%", "max_hp-30%", "ไพ่ดาว ฟื้นฟูเร็วขึ้น แต่ HP สูงสุดลดลง"],
            ["ARC_004", "Death", "instant_kill_chance+5%", "can_be_oneshot=true", "ไพ่มัจจุราช โอกาสสังหารทันที แต่ตัวเองก็โดนได้"]
        ];
        arcanumSheet.getRange(2, 1, cards.length, 5).setValues(cards);
    }

    var titleSheet = ss.getSheetByName("Titles");
    if (titleSheet && titleSheet.getLastRow() < 2) {
        var titles = [
            ["TTL_001", "Attack Holder", "holder", "atk_bonus+20%_to_all_attacks", "highest_atk_in_server", "ผู้มีพลังโจมตีสูงสุดในเซิร์ฟเวอร์"],
            ["TTL_002", "Cursed by Lycagon", "environmental", "monsters_below_50_flee", "survive_lycagon_curse_attack", "รอยคำสาปของ Lycagon"],
            ["TTL_003", "Colossi Slayer", "achievement", "all_boss_dmg+15%", "kill_all_seven_colossi", "ผู้กำจัดสัตว์ประหลาดทั้งเจ็ด"],
            ["TTL_004", "Vorpal Champion", "hidden", "vorpal_race_trust_max", "vorpal_soul>=100", "ผู้ที่ได้รับความไว้วางใจจากเผ่า Vorpal"]
        ];
        titleSheet.getRange(2, 1, titles.length, 6).setValues(titles);
    }

    SpreadsheetApp.getUi().alert("Sample data seeded successfully.");
}

function sheetToRows(name) {
    var sh = getSheet(name);
    if (!sh || sh.getLastRow() < 2) return [];
    var data = sh.getDataRange().getValues();
    var headers = data[0];
    var rows = [];
    for (var i = 1; i < data.length; i++) {
        var row = {};
        for (var j = 0; j < headers.length; j++) {
            row[headers[j]] = String(data[i][j]);
        }
        rows.push(row);
    }
    return rows;
}

function findRowIndex(sheetName, key, value) {
    var sh = getSheet(sheetName);
    if (!sh || sh.getLastRow() < 2) return -1;
    var data = sh.getDataRange().getValues();
    var headers = data[0];
    var colIdx = headers.indexOf(key);
    if (colIdx === -1) return -1;
    for (var i = 1; i < data.length; i++) {
        if (String(data[i][colIdx]) === String(value)) return i + 1;
    }
    return -1;
}

function findRowIndexDouble(sheetName, key1, val1, key2, val2) {
    var sh = getSheet(sheetName);
    if (!sh || sh.getLastRow() < 2) return -1;
    var data = sh.getDataRange().getValues();
    var headers = data[0];
    var c1 = headers.indexOf(key1);
    var c2 = headers.indexOf(key2);
    if (c1 === -1 || c2 === -1) return -1;
    for (var i = 1; i < data.length; i++) {
        if (String(data[i][c1]) === String(val1) && String(data[i][c2]) === String(val2)) return i + 1;
    }
    return -1;
}

function getHeaders(sheetName) {
    var sh = getSheet(sheetName);
    if (!sh) return [];
    return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
}

function rowsToText(rows) {
    if (!rows || rows.length === 0) return "EMPTY";
    var headers = Object.keys(rows[0]);
    var lines = ["HEADERS|" + headers.join("|")];
    for (var i = 0; i < rows.length; i++) {
        var vals = headers.map(function (h) { return rows[i][h] || ""; });
        lines.push("ROW|" + vals.join("|"));
    }
    return lines.join("\n");
}

function singleRowToText(row) {
    if (!row) return "EMPTY";
    var keys = Object.keys(row);
    var vals = keys.map(function (k) { return row[k] || ""; });
    return "HEADERS|" + keys.join("|") + "\nROW|" + vals.join("|");
}

function appendRow(sheetName, rowData) {
    var sh = getSheet(sheetName);
    if (!sh) return false;
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var row = headers.map(function (h) { return rowData[h] !== undefined ? rowData[h] : ""; });
    sh.appendRow(row);
    return true;
}

function updateCell(sheetName, rowIdx, colName, value) {
    var sh = getSheet(sheetName);
    if (!sh) return false;
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var colIdx = headers.indexOf(colName);
    if (colIdx === -1) return false;
    sh.getRange(rowIdx, colIdx + 1).setValue(value);
    return true;
}

function updateRowCells(sheetName, rowIdx, rowData) {
    var sh = getSheet(sheetName);
    if (!sh) return false;
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    for (var key in rowData) {
        var colIdx = headers.indexOf(key);
        if (colIdx !== -1) {
            sh.getRange(rowIdx, colIdx + 1).setValue(rowData[key]);
        }
    }
    return true;
}

function getRowByIndex(sheetName, rowIdx) {
    var sh = getSheet(sheetName);
    if (!sh) return null;
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var values = sh.getRange(rowIdx, 1, 1, sh.getLastColumn()).getValues()[0];
    var row = {};
    for (var i = 0; i < headers.length; i++) {
        row[headers[i]] = String(values[i]);
    }
    return row;
}

function now() {
    return new Date().toISOString();
}

function doGet(e) {
    var p = e.parameter || {};
    var action = p.action || "";
    var out = routeGet(action, p);
    return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
    var body = (e.postData && e.postData.contents) ? e.postData.contents : "";
    var p = parseBody(body);
    var action = p.action || "";
    var out = routePost(action, p);
    return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.TEXT);
}

function parseBody(body) {
    var p = {};
    if (!body) return p;
    body.split("&").forEach(function (pair) {
        var idx = pair.indexOf("=");
        if (idx > 0) {
            var k = decodeURIComponent(pair.substring(0, idx));
            var v = decodeURIComponent(pair.substring(idx + 1));
            p[k] = v;
        }
    });
    return p;
}

function routeGet(action, p) {
    if (action === "get_player") return getPlayer(p.player_id);
    if (action === "get_player_jobs") return getPlayerJobs(p.player_id);
    if (action === "get_player_skills") return getPlayerSkills(p.player_id);
    if (action === "get_player_inventory") return getPlayerInventory(p.player_id);
    if (action === "get_player_titles") return getPlayerTitles(p.player_id);
    if (action === "get_hidden_params") return getHiddenParams(p.player_id);
    if (action === "get_arcanum") return getArcanum(p.player_id);
    if (action === "get_all_jobs") return getAllJobs();
    if (action === "get_job") return getJobById(p.job_id);
    if (action === "get_all_skills") return getAllSkills();
    if (action === "get_skills_by_job") return getSkillsByJob(p.job_id);
    if (action === "get_boss") return getBoss(p.boss_id);
    if (action === "get_all_bosses") return getAllBosses();
    if (action === "get_world_state") return getWorldState();
    if (action === "get_all_equipment") return getAllEquipment();
    if (action === "get_all_titles") return getAllTitles();
    if (action === "get_moon_cycle") return getMoonCycle();
    if (action === "get_world_map") return getWorldMap();
    return "ERROR|UNKNOWN_GET_ACTION";
}

function routePost(action, p) {
    if (action === "create_player") return createPlayer(p);
    if (action === "update_player_stats") return updatePlayerStats(p);
    if (action === "add_exp") return addExp(p);
    if (action === "cap_breakthrough") return capBreakthrough(p);
    if (action === "set_main_job") return setMainJob(p);
    if (action === "set_sub_job") return setSubJob(p);
    if (action === "unlock_job") return unlockJob(p);
    if (action === "unlock_skill") return unlockSkill(p);
    if (action === "evolve_skill") return evolveSkill(p);
    if (action === "link_skill_combo") return linkSkillCombo(p);
    if (action === "kill_boss") return killBoss(p);
    if (action === "add_item") return addItem(p);
    if (action === "remove_item") return removeItem(p);
    if (action === "raise_item") return raiseItem(p);
    if (action === "ascend_item") return ascendItem(p);
    if (action === "add_title") return addTitle(p);
    if (action === "update_hidden_param") return updateHiddenParam(p);
    if (action === "set_arcanum") return setArcanum(p);
    if (action === "toggle_arcanum") return toggleArcanum(p);
    if (action === "update_karma") return updateKarma(p);
    if (action === "update_vorpal_soul") return updateVorpalSoul(p);
    if (action === "set_world_state") return setWorldState(p);
    if (action === "advance_moon_cycle") return advanceMoonCycle(p);
    if (action === "npc_permadeath") return npcPermadeath(p);
    if (action === "update_holder_title") return updateHolderTitle(p);
    if (action === "save_world_map") return saveWorldMap(p);
    return "ERROR|UNKNOWN_POST_ACTION";
}

function getPlayer(playerId) {
    if (!playerId) return "ERROR|MISSING_PLAYER_ID";
    var rows = sheetToRows("Players");
    for (var i = 0; i < rows.length; i++) {
        if (rows[i].player_id === String(playerId)) return singleRowToText(rows[i]);
    }
    return "ERROR|PLAYER_NOT_FOUND";
}

function createPlayer(p) {
    if (!p.player_id || !p.name) return "ERROR|MISSING_REQUIRED_FIELDS";
    if (findRowIndex("Players", "player_id", p.player_id) !== -1) return "ERROR|PLAYER_ALREADY_EXISTS";
    var row = {
        player_id: p.player_id,
        name: p.name,
        level: "1",
        exp: "0",
        stored_exp: "0",
        main_job_id: "",
        sub_job_id: "",
        karma: "0",
        vorpal_soul: "0",
        arcanum_id: "",
        hp: "100",
        mp: "100",
        atk: "10",
        def: "10",
        spd: "10",
        appearance: p.appearance || "",
        created_at: now()
    };
    appendRow("Players", row);
    return "OK|PLAYER_CREATED|" + p.player_id;
}

function updatePlayerStats(p) {
    if (!p.player_id) return "ERROR|MISSING_PLAYER_ID";
    var rowIdx = findRowIndex("Players", "player_id", p.player_id);
    if (rowIdx === -1) return "ERROR|PLAYER_NOT_FOUND";
    var allowed = ["hp", "mp", "atk", "def", "spd", "name", "appearance"];
    var updates = {};
    allowed.forEach(function (f) { if (p[f] !== undefined) updates[f] = p[f]; });
    updateRowCells("Players", rowIdx, updates);
    return "OK|STATS_UPDATED|" + p.player_id;
}

function addExp(p) {
    if (!p.player_id || !p.exp_amount) return "ERROR|MISSING_FIELDS";
    var rowIdx = findRowIndex("Players", "player_id", p.player_id);
    if (rowIdx === -1) return "ERROR|PLAYER_NOT_FOUND";
    var row = getRowByIndex("Players", rowIdx);
    var level = parseInt(row.level) || 1;
    var exp = parseInt(row.exp) || 0;
    var stored = parseInt(row.stored_exp) || 0;
    var amount = parseInt(p.exp_amount) || 0;
    if (level >= 99 && level < 150) {
        stored += amount;
        updateCell("Players", rowIdx, "stored_exp", String(stored));
        return "OK|EXP_STORED|" + stored;
    }
    exp += amount;
    updateCell("Players", rowIdx, "exp", String(exp));
    return "OK|EXP_ADDED|" + exp;
}

function capBreakthrough(p) {
    if (!p.player_id) return "ERROR|MISSING_PLAYER_ID";
    var rowIdx = findRowIndex("Players", "player_id", p.player_id);
    if (rowIdx === -1) return "ERROR|PLAYER_NOT_FOUND";
    var row = getRowByIndex("Players", rowIdx);
    var level = parseInt(row.level) || 1;
    if (level < 99) return "ERROR|LEVEL_CAP_NOT_REACHED";
    var condition = p.condition || "";
    if (condition !== "new_continent" && condition !== "kill_lv100_boss") return "ERROR|INVALID_BREAKTHROUGH_CONDITION";
    var stored = parseInt(row.stored_exp) || 0;
    updateRowCells("Players", rowIdx, { level: "100", exp: String(stored), stored_exp: "0" });
    return "OK|CAP_BROKEN|100";
}

function getPlayerJobs(playerId) {
    if (!playerId) return "ERROR|MISSING_PLAYER_ID";
    var rows = sheetToRows("PlayerJobs");
    var result = rows.filter(function (r) { return r.player_id === String(playerId); });
    return rowsToText(result);
}

function getAllJobs() {
    return rowsToText(sheetToRows("Jobs"));
}

function getJobById(jobId) {
    if (!jobId) return "ERROR|MISSING_JOB_ID";
    var rows = sheetToRows("Jobs");
    for (var i = 0; i < rows.length; i++) {
        if (rows[i].job_id === String(jobId)) return singleRowToText(rows[i]);
    }
    return "ERROR|JOB_NOT_FOUND";
}

function unlockJob(p) {
    if (!p.player_id || !p.job_id) return "ERROR|MISSING_FIELDS";
    var jobRows = sheetToRows("Jobs");
    var job = null;
    for (var i = 0; i < jobRows.length; i++) {
        if (jobRows[i].job_id === String(p.job_id)) { job = jobRows[i]; break; }
    }
    if (!job) return "ERROR|JOB_NOT_FOUND";
    if (job.is_hidden === "1" && (!p.unlock_condition || p.unlock_condition !== job.unlock_condition)) {
        return "ERROR|HIDDEN_JOB_CONDITION_NOT_MET";
    }
    if (findRowIndexDouble("PlayerJobs", "player_id", p.player_id, "job_id", p.job_id) !== -1) {
        return "ERROR|JOB_ALREADY_UNLOCKED";
    }
    appendRow("PlayerJobs", { player_id: p.player_id, job_id: p.job_id, unlocked_at: now() });
    return "OK|JOB_UNLOCKED|" + p.job_id;
}

function setMainJob(p) {
    if (!p.player_id || !p.job_id) return "ERROR|MISSING_FIELDS";
    if (findRowIndexDouble("PlayerJobs", "player_id", p.player_id, "job_id", p.job_id) === -1) {
        return "ERROR|JOB_NOT_UNLOCKED";
    }
    var rowIdx = findRowIndex("Players", "player_id", p.player_id);
    if (rowIdx === -1) return "ERROR|PLAYER_NOT_FOUND";
    var row = getRowByIndex("Players", rowIdx);
    if (row.sub_job_id === String(p.job_id)) return "ERROR|JOB_ALREADY_SET_AS_SUB";
    updateCell("Players", rowIdx, "main_job_id", p.job_id);
    return "OK|MAIN_JOB_SET|" + p.job_id;
}

function setSubJob(p) {
    if (!p.player_id || !p.job_id) return "ERROR|MISSING_FIELDS";
    if (findRowIndexDouble("PlayerJobs", "player_id", p.player_id, "job_id", p.job_id) === -1) {
        return "ERROR|JOB_NOT_UNLOCKED";
    }
    var rowIdx = findRowIndex("Players", "player_id", p.player_id);
    if (rowIdx === -1) return "ERROR|PLAYER_NOT_FOUND";
    var row = getRowByIndex("Players", rowIdx);
    if (row.main_job_id === String(p.job_id)) return "ERROR|JOB_ALREADY_SET_AS_MAIN";
    updateCell("Players", rowIdx, "sub_job_id", p.job_id);
    return "OK|SUB_JOB_SET|" + p.job_id;
}

function getAllSkills() {
    return rowsToText(sheetToRows("Skills"));
}

function getSkillsByJob(jobId) {
    if (!jobId) return "ERROR|MISSING_JOB_ID";
    var rows = sheetToRows("Skills");
    var result = rows.filter(function (r) { return r.job_id === String(jobId); });
    return rowsToText(result);
}

function getPlayerSkills(playerId) {
    if (!playerId) return "ERROR|MISSING_PLAYER_ID";
    var rows = sheetToRows("PlayerSkills");
    var result = rows.filter(function (r) { return r.player_id === String(playerId); });
    return rowsToText(result);
}

function unlockSkill(p) {
    if (!p.player_id || !p.skill_id) return "ERROR|MISSING_FIELDS";
    var skillRows = sheetToRows("Skills");
    var skill = null;
    for (var i = 0; i < skillRows.length; i++) {
        if (skillRows[i].skill_id === String(p.skill_id)) { skill = skillRows[i]; break; }
    }
    if (!skill) return "ERROR|SKILL_NOT_FOUND";
    if (findRowIndexDouble("PlayerSkills", "player_id", p.player_id, "skill_id", p.skill_id) !== -1) {
        return "ERROR|SKILL_ALREADY_UNLOCKED";
    }
    if (skill.parent_skill_id && skill.parent_skill_id !== "") {
        if (findRowIndexDouble("PlayerSkills", "player_id", p.player_id, "skill_id", skill.parent_skill_id) === -1) {
            return "ERROR|PARENT_SKILL_NOT_UNLOCKED";
        }
    }
    var playerRow = getRowByIndex("Players", findRowIndex("Players", "player_id", p.player_id));
    if (!playerRow) return "ERROR|PLAYER_NOT_FOUND";
    var isSubJob = playerRow.sub_job_id === skill.job_id;
    var maxTier = isSubJob ? "2" : "3";
    if (parseInt(skill.tier) > parseInt(maxTier)) {
        return "ERROR|SKILL_TIER_LOCKED_FOR_SUB_JOB";
    }
    appendRow("PlayerSkills", {
        player_id: p.player_id,
        skill_id: p.skill_id,
        skill_level: "1",
        branch_chosen: "",
        is_locked: "0",
        unlocked_at: now()
    });
    return "OK|SKILL_UNLOCKED|" + p.skill_id;
}

function evolveSkill(p) {
    if (!p.player_id || !p.skill_id || !p.branch) return "ERROR|MISSING_FIELDS";
    var psRowIdx = findRowIndexDouble("PlayerSkills", "player_id", p.player_id, "skill_id", p.skill_id);
    if (psRowIdx === -1) return "ERROR|SKILL_NOT_UNLOCKED";
    var psRow = getRowByIndex("PlayerSkills", psRowIdx);
    if (psRow.is_locked === "1") return "ERROR|SKILL_BRANCH_LOCKED";
    if (psRow.branch_chosen !== "" && psRow.branch_chosen !== String(p.branch)) {
        return "ERROR|DIFFERENT_BRANCH_ALREADY_CHOSEN";
    }
    var skillRow = sheetToRows("Skills").filter(function (r) { return r.skill_id === String(p.skill_id); })[0];
    if (!skillRow) return "ERROR|SKILL_NOT_FOUND";
    var validBranches = skillRow.evolution_branches ? skillRow.evolution_branches.split(",") : [];
    if (validBranches.length > 0 && validBranches.indexOf(String(p.branch)) === -1) {
        return "ERROR|INVALID_BRANCH";
    }
    updateRowCells("PlayerSkills", psRowIdx, { branch_chosen: p.branch, is_locked: "0" });
    var allPlayerSkills = sheetToRows("PlayerSkills").filter(function (r) {
        return r.player_id === String(p.player_id) && r.skill_id === String(p.skill_id);
    });
    return "OK|SKILL_EVOLVED|" + p.skill_id + "|" + p.branch;
}

function linkSkillCombo(p) {
    if (!p.player_id || !p.skill_id_1 || !p.skill_id_2 || !p.combo_name) return "ERROR|MISSING_FIELDS";
    var has1 = findRowIndexDouble("PlayerSkills", "player_id", p.player_id, "skill_id", p.skill_id_1) !== -1;
    var has2 = findRowIndexDouble("PlayerSkills", "player_id", p.player_id, "skill_id", p.skill_id_2) !== -1;
    if (!has1 || !has2) return "ERROR|SKILLS_NOT_UNLOCKED";
    if (findRowIndexDouble("SkillCombos", "player_id", p.player_id, "combo_name", p.combo_name) !== -1) {
        return "ERROR|COMBO_ALREADY_EXISTS";
    }
    appendRow("SkillCombos", {
        player_id: p.player_id,
        skill_id_1: p.skill_id_1,
        skill_id_2: p.skill_id_2,
        combo_name: p.combo_name,
        power_bonus: p.power_bonus || "10",
        created_at: now()
    });
    return "OK|COMBO_LINKED|" + p.combo_name;
}

function getAllBosses() {
    return rowsToText(sheetToRows("WorldBoss"));
}

function getBoss(bossId) {
    if (!bossId) return "ERROR|MISSING_BOSS_ID";
    var rows = sheetToRows("WorldBoss");
    for (var i = 0; i < rows.length; i++) {
        if (rows[i].boss_id === String(bossId)) return singleRowToText(rows[i]);
    }
    return "ERROR|BOSS_NOT_FOUND";
}

function killBoss(p) {
    if (!p.player_id || !p.boss_id) return "ERROR|MISSING_FIELDS";
    var rowIdx = findRowIndex("WorldBoss", "boss_id", p.boss_id);
    if (rowIdx === -1) return "ERROR|BOSS_NOT_FOUND";
    var bossRow = getRowByIndex("WorldBoss", rowIdx);
    if (bossRow.is_alive === "0") return "ERROR|BOSS_ALREADY_DEAD";
    if (p.scenario_key !== bossRow.required_scenario_key) return "ERROR|SCENARIO_NOT_UNLOCKED";
    updateRowCells("WorldBoss", rowIdx, {
        is_alive: "0",
        killer_player_id: p.player_id,
        killed_at: now(),
        lore_unlocked: "1"
    });
    var colossusRank = bossRow.colossus_rank || "";
    checkWorldProgression();
    return "OK|BOSS_KILLED|" + p.boss_id + "|LORE_UNLOCKED|" + bossRow.lore_text;
}

function checkWorldProgression() {
    var bosses = sheetToRows("WorldBoss");
    var colossi = bosses.filter(function (b) { return b.colossus_rank !== ""; });
    var allDead = colossi.every(function (b) { return b.is_alive === "0"; });
    if (allDead) {
        setWorldState({ key: "main_story_phase", value: "post_colossi" });
    }
}

function getWorldState() {
    return rowsToText(sheetToRows("WorldState"));
}

function setWorldState(p) {
    if (!p.key || !p.value) return "ERROR|MISSING_FIELDS";
    var rowIdx = findRowIndex("WorldState", "key", p.key);
    if (rowIdx === -1) {
        appendRow("WorldState", { key: p.key, value: p.value, updated_at: now() });
    } else {
        updateRowCells("WorldState", rowIdx, { value: p.value, updated_at: now() });
    }
    return "OK|WORLD_STATE_SET|" + p.key + "|" + p.value;
}

function getAllEquipment() {
    return rowsToText(sheetToRows("Equipment"));
}

function getPlayerInventory(playerId) {
    if (!playerId) return "ERROR|MISSING_PLAYER_ID";
    var rows = sheetToRows("PlayerInventory");
    var result = rows.filter(function (r) { return r.player_id === String(playerId); });
    return rowsToText(result);
}

function addItem(p) {
    if (!p.player_id || !p.item_id) return "ERROR|MISSING_FIELDS";
    var eqRow = sheetToRows("Equipment").filter(function (r) { return r.item_id === String(p.item_id); })[0];
    if (!eqRow) return "ERROR|ITEM_NOT_FOUND";
    if (eqRow.is_hero_weapon === "1") {
        var existing = sheetToRows("PlayerInventory").filter(function (r) { return r.item_id === String(p.item_id); });
        if (existing.length >= parseInt(eqRow.max_quantity || "1")) return "ERROR|HERO_WEAPON_LIMIT_REACHED";
    }
    var rowIdx = findRowIndexDouble("PlayerInventory", "player_id", p.player_id, "item_id", p.item_id);
    if (rowIdx !== -1 && eqRow.is_hero_weapon !== "1") {
        var row = getRowByIndex("PlayerInventory", rowIdx);
        var qty = parseInt(row.quantity || "0") + parseInt(p.quantity || "1");
        updateCell("PlayerInventory", rowIdx, "quantity", String(qty));
        return "OK|ITEM_QUANTITY_UPDATED|" + p.item_id + "|" + qty;
    }
    appendRow("PlayerInventory", {
        player_id: p.player_id,
        item_id: p.item_id,
        quantity: p.quantity || "1",
        raise_level: "0",
        ascension_form: "base",
        obtained_at: now()
    });
    return "OK|ITEM_ADDED|" + p.item_id;
}

function removeItem(p) {
    if (!p.player_id || !p.item_id) return "ERROR|MISSING_FIELDS";
    var rowIdx = findRowIndexDouble("PlayerInventory", "player_id", p.player_id, "item_id", p.item_id);
    if (rowIdx === -1) return "ERROR|ITEM_NOT_IN_INVENTORY";
    var row = getRowByIndex("PlayerInventory", rowIdx);
    var qty = parseInt(row.quantity || "0") - parseInt(p.quantity || "1");
    if (qty <= 0) {
        getSheet("PlayerInventory").deleteRow(rowIdx);
        return "OK|ITEM_REMOVED|" + p.item_id;
    }
    updateCell("PlayerInventory", rowIdx, "quantity", String(qty));
    return "OK|ITEM_QUANTITY_REDUCED|" + p.item_id + "|" + qty;
}

function raiseItem(p) {
    if (!p.player_id || !p.item_id) return "ERROR|MISSING_FIELDS";
    var rowIdx = findRowIndexDouble("PlayerInventory", "player_id", p.player_id, "item_id", p.item_id);
    if (rowIdx === -1) return "ERROR|ITEM_NOT_IN_INVENTORY";
    var row = getRowByIndex("PlayerInventory", rowIdx);
    var currentRaise = parseInt(row.raise_level || "0");
    var maxRaise = 10;
    if (currentRaise >= maxRaise) return "ERROR|MAX_RAISE_LEVEL_REACHED";
    updateCell("PlayerInventory", rowIdx, "raise_level", String(currentRaise + 1));
    return "OK|ITEM_RAISED|" + p.item_id + "|" + (currentRaise + 1);
}

function ascendItem(p) {
    if (!p.player_id || !p.item_id || !p.material_id) return "ERROR|MISSING_FIELDS";
    var rowIdx = findRowIndexDouble("PlayerInventory", "player_id", p.player_id, "item_id", p.item_id);
    if (rowIdx === -1) return "ERROR|ITEM_NOT_IN_INVENTORY";
    var matIdx = findRowIndexDouble("PlayerInventory", "player_id", p.player_id, "item_id", p.material_id);
    if (matIdx === -1) return "ERROR|MATERIAL_NOT_IN_INVENTORY";
    var eqRow = sheetToRows("Equipment").filter(function (r) { return r.item_id === String(p.item_id); })[0];
    if (!eqRow) return "ERROR|ITEM_DEF_NOT_FOUND";
    var ascTable = eqRow.ascension_table ? eqRow.ascension_table.split(";") : [];
    var newForm = p.target_form || "ascended_1";
    updateCell("PlayerInventory", rowIdx, "ascension_form", newForm);
    removeItem({ player_id: p.player_id, item_id: p.material_id, quantity: "1" });
    return "OK|ITEM_ASCENDED|" + p.item_id + "|" + newForm;
}

function getAllTitles() {
    return rowsToText(sheetToRows("Titles"));
}

function getPlayerTitles(playerId) {
    if (!playerId) return "ERROR|MISSING_PLAYER_ID";
    var rows = sheetToRows("PlayerTitles");
    var result = rows.filter(function (r) { return r.player_id === String(playerId); });
    return rowsToText(result);
}

function addTitle(p) {
    if (!p.player_id || !p.title_id) return "ERROR|MISSING_FIELDS";
    var titleRow = sheetToRows("Titles").filter(function (r) { return r.title_id === String(p.title_id); })[0];
    if (!titleRow) return "ERROR|TITLE_NOT_FOUND";
    if (findRowIndexDouble("PlayerTitles", "player_id", p.player_id, "title_id", p.title_id) !== -1) {
        return "ERROR|TITLE_ALREADY_OWNED";
    }
    appendRow("PlayerTitles", {
        player_id: p.player_id,
        title_id: p.title_id,
        obtained_at: now(),
        source: p.source || "unknown"
    });
    if (titleRow.title_type === "holder") {
        updateHolderTitle({ player_id: p.player_id, title_id: p.title_id, stat_value: p.stat_value || "0" });
    }
    return "OK|TITLE_ADDED|" + p.title_id + "|" + titleRow.title_name;
}

function updateHolderTitle(p) {
    if (!p.player_id || !p.title_id) return "ERROR|MISSING_FIELDS";
    var rowIdx = findRowIndex("HolderRecords", "title_id", p.title_id);
    if (rowIdx === -1) {
        appendRow("HolderRecords", {
            title_id: p.title_id,
            player_id: p.player_id,
            stat_value: p.stat_value || "0",
            updated_at: now()
        });
    } else {
        var existing = getRowByIndex("HolderRecords", rowIdx);
        if (parseInt(p.stat_value || "0") > parseInt(existing.stat_value || "0")) {
            updateRowCells("HolderRecords", rowIdx, {
                player_id: p.player_id,
                stat_value: p.stat_value,
                updated_at: now()
            });
        }
    }
    return "OK|HOLDER_UPDATED|" + p.title_id;
}

function getHiddenParams(playerId) {
    if (!playerId) return "ERROR|MISSING_PLAYER_ID";
    var rows = sheetToRows("HiddenParams");
    var result = rows.filter(function (r) { return r.player_id === String(playerId); });
    return rowsToText(result);
}

function updateHiddenParam(p) {
    if (!p.player_id || !p.param_name || !p.param_value) return "ERROR|MISSING_FIELDS";
    var rowIdx = findRowIndexDouble("HiddenParams", "player_id", p.player_id, "param_name", p.param_name);
    if (rowIdx === -1) {
        appendRow("HiddenParams", {
            player_id: p.player_id,
            param_name: p.param_name,
            param_value: p.param_value,
            last_updated: now()
        });
    } else {
        updateRowCells("HiddenParams", rowIdx, {
            param_value: p.param_value,
            last_updated: now()
        });
    }
    return "OK|HIDDEN_PARAM_UPDATED|" + p.param_name + "|" + p.param_value;
}

function updateKarma(p) {
    if (!p.player_id || !p.delta) return "ERROR|MISSING_FIELDS";
    var rowIdx = findRowIndex("Players", "player_id", p.player_id);
    if (rowIdx === -1) return "ERROR|PLAYER_NOT_FOUND";
    var row = getRowByIndex("Players", rowIdx);
    var karma = parseInt(row.karma || "0") + parseInt(p.delta);
    updateCell("Players", rowIdx, "karma", String(karma));
    var status = "neutral";
    if (karma >= 100) status = "dark_accessible";
    if (karma >= 200) status = "bounty_target";
    updateHiddenParam({ player_id: p.player_id, param_name: "karma_status", param_value: status });
    return "OK|KARMA_UPDATED|" + karma + "|" + status;
}

function updateVorpalSoul(p) {
    if (!p.player_id || !p.delta) return "ERROR|MISSING_FIELDS";
    var rowIdx = findRowIndex("Players", "player_id", p.player_id);
    if (rowIdx === -1) return "ERROR|PLAYER_NOT_FOUND";
    var row = getRowByIndex("Players", rowIdx);
    var vs = parseInt(row.vorpal_soul || "0") + parseInt(p.delta);
    if (vs < 0) vs = 0;
    updateCell("Players", rowIdx, "vorpal_soul", String(vs));
    var threshold = 50;
    if (vs >= threshold) {
        updateHiddenParam({ player_id: p.player_id, param_name: "vorpal_trust", param_value: "unlocked" });
    }
    return "OK|VORPAL_SOUL_UPDATED|" + vs;
}

function getArcanum(playerId) {
    if (!playerId) return "ERROR|MISSING_PLAYER_ID";
    var rows = sheetToRows("Arcanum");
    var result = rows.filter(function (r) { return r.player_id === String(playerId); });
    return rowsToText(result);
}

function setArcanum(p) {
    if (!p.player_id || !p.card_id) return "ERROR|MISSING_FIELDS";
    var cardRow = sheetToRows("ArcanumCards").filter(function (r) { return r.card_id === String(p.card_id); })[0];
    if (!cardRow) return "ERROR|ARCANUM_CARD_NOT_FOUND";
    var existing = findRowIndex("Arcanum", "player_id", p.player_id);
    if (existing !== -1) {
        updateRowCells("Arcanum", existing, {
            card_id: p.card_id,
            card_name: cardRow.card_name,
            positive_effect: cardRow.positive_effect,
            negative_effect: cardRow.negative_effect,
            is_reverse: "0",
            is_controllable: "0",
            activated: "1",
            set_at: now()
        });
    } else {
        appendRow("Arcanum", {
            player_id: p.player_id,
            card_id: p.card_id,
            card_name: cardRow.card_name,
            positive_effect: cardRow.positive_effect,
            negative_effect: cardRow.negative_effect,
            is_reverse: "0",
            is_controllable: "0",
            activated: "1",
            set_at: now()
        });
    }
    var playerRowIdx = findRowIndex("Players", "player_id", p.player_id);
    if (playerRowIdx !== -1) {
        var playerRow = getRowByIndex("Players", playerRowIdx);
        if (parseInt(playerRow.level || "0") >= 150) {
            var arcanumIdx = findRowIndex("Arcanum", "player_id", p.player_id);
            if (arcanumIdx !== -1) updateCell("Arcanum", arcanumIdx, "is_reverse", "1");
        }
    }
    return "OK|ARCANUM_SET|" + p.card_id + "|" + cardRow.card_name;
}

function toggleArcanum(p) {
    if (!p.player_id) return "ERROR|MISSING_PLAYER_ID";
    var rowIdx = findRowIndex("Arcanum", "player_id", p.player_id);
    if (rowIdx === -1) return "ERROR|ARCANUM_NOT_SET";
    var row = getRowByIndex("Arcanum", rowIdx);
    if (row.is_controllable !== "1") return "ERROR|ARCANUM_NOT_CONTROLLABLE";
    var newState = row.activated === "1" ? "0" : "1";
    updateCell("Arcanum", rowIdx, "activated", newState);
    return "OK|ARCANUM_TOGGLED|" + newState;
}

function getMoonCycle() {
    var rows = sheetToRows("WorldState");
    var moonRow = rows.filter(function (r) { return r.key === "moon_phase"; })[0];
    var manaRow = rows.filter(function (r) { return r.key === "mana_level"; })[0];
    var phase = moonRow ? moonRow.value : "full";
    var mana = manaRow ? manaRow.value : "100";
    return "HEADERS|moon_phase|mana_level\nROW|" + phase + "|" + mana;
}

function advanceMoonCycle(p) {
    var phases = ["new", "waxing_crescent", "first_quarter", "waxing_gibbous", "full", "waning_gibbous", "last_quarter", "waning_crescent"];
    var manaLevels = { "new": "40", "waxing_crescent": "55", "first_quarter": "70", "waxing_gibbous": "85", "full": "120", "waning_gibbous": "100", "last_quarter": "75", "waning_crescent": "55" };
    var rows = sheetToRows("WorldState");
    var moonRow = rows.filter(function (r) { return r.key === "moon_phase"; })[0];
    var currentPhase = moonRow ? moonRow.value : "new";
    var idx = phases.indexOf(currentPhase);
    var nextPhase = phases[(idx + 1) % phases.length];
    setWorldState({ key: "moon_phase", value: nextPhase });
    setWorldState({ key: "mana_level", value: manaLevels[nextPhase] });
    return "OK|MOON_ADVANCED|" + nextPhase + "|MANA|" + manaLevels[nextPhase];
}

function npcPermadeath(p) {
    if (!p.npc_id || !p.scenario_id) return "ERROR|MISSING_FIELDS";
    var rowIdx = findRowIndexDouble("NPCStatus", "npc_id", p.npc_id, "scenario_id", p.scenario_id);
    if (rowIdx === -1) {
        appendRow("NPCStatus", {
            npc_id: p.npc_id,
            scenario_id: p.scenario_id,
            is_dead: "1",
            killed_by: p.player_id || "unknown",
            killed_at: now(),
            quest_closed: "1"
        });
    } else {
        updateRowCells("NPCStatus", rowIdx, { is_dead: "1", quest_closed: "1", killed_at: now() });
    }
    return "OK|NPC_DEAD|" + p.npc_id + "|QUEST_CLOSED";
}