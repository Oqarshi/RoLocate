// ==UserScript==
// @name         RoLocate
// @namespace    https://oqarshi.github.io/
// @version      46.6
// @description  Adds filter options to roblox server page. Alternative to paid extensions like RoPro, RoGold®, RoQol, and RoKit.
// @author       Oqarshi
// @match        https://www.roblox.com/*
// @license      Custom - Personal Use Only
// @icon         https://oqarshi.github.io/Invite/rolocate/assets/logo.svg
// @supportURL   https://greasyfork.org/en/scripts/523727-rolocate/feedback
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_setValue
// @grant        GM_deleteValue
// @require      https://update.greasyfork.org/scripts/535590/1586769/Rolocate%20Base64%20Image%20Library%2020.js
// @require      https://update.greasyfork.org/scripts/547134/1796560/Rolocate%20Server%20Region%20Data%20%28Data%20Saving%29.js
// @require      https://update.greasyfork.org/scripts/540553/1648593/Rolocate%20Flag%20Base64%20Data.js
// @require      https://update.greasyfork.org/scripts/544437/1642116/Rolocate%20Restore%20Classic%20Terms%20All%20Languages.js
// @connect      thumbnails.roblox.com
// @connect      games.roblox.com
// @connect      gamejoin.roblox.com
// @connect      presence.roblox.com
// @connect      www.roblox.com
// @connect      friends.roblox.com
// @connect      apis.roblox.com
// @connect      groups.roblox.com
// @connect      users.roblox.com
// @connect      catalog.roblox.com
// ==/UserScript==


/**
 * -- RoLocate Userscript --------------------------------
 * Author: Oqarshi
 * License: Custom - Personal Use Only
 * Copyright (c) 2026 Oqarshi
 *
 * This license grants limited rights to end users and does not imply
 * any transfer of copyright ownership.
 *
 * You MAY:
 *   * Use and modify this script for personal, non-commercial use only.
 *
 * You MAY NOT:
 *   * Redistribute or reupload this script (original or modified)
 *   * Publish it on any website (GreasyFork, GitHub, UserScripts.org, etc.)
 *   * Include it in commercial, monetized, or donation-based tools
 *   * Remove or alter this license or attribution
 *
 * Attribution to the original author (Oqarshi) must always be preserved.
 * Violations may result in takedown notices under DMCA or applicable law.
 *
 * --- Dependencies --------------------------------------
 * * Base64 Images & Icons:
 *   https://update.greasyfork.org/scripts/535590/1586769/Rolocate%20Base64%20Image%20Library%2020.js
 *
 * * Server Regions Data:
 *   https://update.greasyfork.org/scripts/547134/1652105/Rolocate%20Server%20Region%20Data%20%28Data%20Saving%29.js
 *
 * * Flag Icons (Base64):
 *   https://update.greasyfork.org/scripts/540553/1648593/Rolocate%20Flag%20Base64%20Data.js
 *
 * * Classic Terms Replacements:
 *   https://update.greasyfork.org/scripts/544437/1642116/Rolocate%20Restore%20Classic%20Terms%20All%20Languages.js
 *
 * -------------------------------------------------------
 */

/*jshint esversion: 6 */
/*jshint esversion: 11 */
(function() {
    'use strict';

    //---------------XSS Attack Vectors Protection--------------------
    // ik this should be fixed, but roblox engineers are not the brightest...
    // so extra protection i guess.
    // escape the html. Used in consolog function, notifications function, etc.
    const escapeHtmlnoxssattackvectors = (text) => {
        const temp = document.createElement('div');
        temp.textContent = text;
        return temp.innerHTML;
    };

    // for numbers. currently used in loadbetterprofileinfo function
    const sanitizeUserId = (id) => {
        const numId = parseInt(id, 10);
        return (!isNaN(numId) && numId > 0) ? numId : 0; // return 0 install of null yea
    };

    // for attributes. currenlty used in custombackgrounds function
    const sanitizeAttribute = (str) => {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
    };

    // for hex value colors. currenlty used in custombackgrounds function
    const sanitizeColor = (color) => {
        return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#ffffff';
    };

    // for css values like rgb and rgba. currenlty used in custombackgrounds function
    const sanitizeCssValue = (value) => {
        const rgbaPattern = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)$/;
        const hexPattern = /^#[0-9A-Fa-f]{3,6}$/;
        return (rgbaPattern.test(value) || hexPattern.test(value)) ? value : 'rgba(40,40,40,0.85)';
    };
    //----------------------------------------------------------

    /*******************************************************
    name of function: ConsoleLogEnabled
    description: console.logs everything if settings is turned
    on
    *******************************************************/
    const MAX_LOG_BYTES = 3 * 1024 * 1024; // 3 mb of ram
    let rolocateLogSize = 0;

    function ConsoleLogEnabled(...args) {
        if (localStorage.getItem("ROLOCATE_enableLogs") !== "true") return;

        window.rolocateLogBuffer ??= [];

        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
        const entry = { time: new Date().toLocaleTimeString(), msg };
        const size = JSON.stringify(entry).length;

        window.rolocateLogBuffer.push(entry);
        rolocateLogSize += size;

        while (rolocateLogSize > MAX_LOG_BYTES) {
            const removed = window.rolocateLogBuffer.shift();
            rolocateLogSize -= JSON.stringify(removed).length;
        }

        console.log("[ROLOCATE]", ...args);
    }

    /*******************************************************
    name of function: isDarkMode
    description: tells if user is using dark mode on roblox
    *******************************************************/
    // ok so this doesent work for custombackgrounds and im to lazy to figure out a solutions so im sorry lmao
    // ik i could jsut send a request to the roblox api, but thats more work so nah
    function isDarkMode(bypass = false) {
        if (!bypass && localStorage.getItem("ROLOCATE_forcedarkmode") === "true") { // exception
            return true;
        }
        const bg = getComputedStyle(document.body).backgroundColor;
        const rgb = bg.match(/\d+/g).map(Number);
        const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000; // funny vision formula from google
        return brightness < 128; // true = dark, false = light
    }

    /*******************************************************
    name of function: getCurrentGameId
    description: uh gets gameid
    *******************************************************/
    const getCurrentGameId = () => {
        const urlMatch = window.location.href.match(/games\/(\d+)/);
        const gameId = urlMatch ? urlMatch[1] : null;
        ConsoleLogEnabled(`getCurrentGameId: ${gameId}`);
        return sanitizeUserId(gameId); // protection
    };

    /*******************************************************
    name of function: getCurrentUserId
    description: gets user's id from roblox page.
    *******************************************************/
    function getCurrentUserId() {
        // 1st: try to grab the userId directly from Roblox's JS object
        const primaryUserId = sanitizeUserId(Roblox?.CurrentUser?.userId);

        // some extensions like roseal and btr break this and set the userId to 0
        // so if user id is not 0, return, if it is then try another method
        if (primaryUserId && primaryUserId !== 0) {
            return primaryUserId;
        }

        // 2nd: check in dom for user id instead
        const Userid2ndmethodcauserosealandbtrbreakyeayeay = document.querySelector('meta[name="user-data"]');
        if (Userid2ndmethodcauserosealandbtrbreakyeayeay) {
            // get it then yea
            const fallbackUserId = parseInt(
                Userid2ndmethodcauserosealandbtrbreakyeayeay.getAttribute('data-userid'),
                10
            );

            // xtikhgiasgd protedtion what ever
            if (fallbackUserId > 0) {
                return sanitizeUserId(fallbackUserId);
            }
        }

        // lowkey just give up, im too lazy to find an api that exposes the userid
        return 0;
    }

    /*******************************************************
    name of function: getUniverseIdFromPlaceId
    description: gets universeid from place id
    *******************************************************/
    function getUniverseIdFromPlaceId(placeId) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: `https://games.roblox.com/v1/games/multiget-place-details?placeIds=${placeId}`,
                headers: {
                    "Accept": "application/json"
                },
                onload: function(response) {
                    if (response.status === 200) {
                        try {
                            const data = JSON.parse(response.responseText);
                            if (Array.isArray(data) && data.length > 0 && data[0].universeId) {
                                // Console log inside the function
                                ConsoleLogEnabled(`Universe ID for place ${placeId}: ${data[0].universeId}`);
                                resolve(data[0].universeId);
                            } else {
                                reject(new Error("Universe ID not found in response."));
                            }
                        } catch (e) {
                            reject(e);
                        }
                    } else {
                        reject(new Error(`HTTP error! Status: ${response.status}`));
                    }
                },
                onerror: function(err) {
                    reject(err);
                }
            });
        });
    }

    /*******************************************************
    name of function: getGameIconFromUniverseId
    description: gets the game icon
    *******************************************************/
    function getGameIconFromUniverseId(universeIds) {
        const isSingle = !Array.isArray(universeIds);
        const idsArray = isSingle ? [universeIds] : universeIds;

        // Split into chunks of 10
        const chunkSize = 10;
        const chunks = [];
        for (let i = 0; i < idsArray.length; i += chunkSize) {
            chunks.push(idsArray.slice(i, i + chunkSize));
        }

        // Helper to fetch one chunk
        function fetchChunk(chunk) {
            const apiUrl = `https://thumbnails.roblox.com/v1/games/icons?universeIds=${chunk.join(",")}&size=512x512&format=Png&isCircular=false&returnPolicy=PlaceHolder`;

            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: apiUrl,
                    headers: {
                        "Accept": "application/json"
                    },
                    onload: function(response) {
                        if (response.status === 200) {
                            try {
                                const data = JSON.parse(response.responseText);
                                resolve(data.data || []);
                            } catch (err) {
                                reject(err);
                            }
                        } else {
                            reject(new Error(`HTTP error! Status: ${response.status}`));
                        }
                    },
                    onerror: reject
                });
            });
        }

        // Run all chunk requests
        return Promise.all(chunks.map(fetchChunk))
            .then(results => {
                const combined = results.flat();

                if (combined.length === 0) {
                    throw new Error("No data returned.");
                }

                // MULTIPLE → return map
                if (!isSingle) {
                    const map = {};
                    combined.forEach(item => {
                        if (item.imageUrl) {
                            map[item.targetId] = item.imageUrl;
                        }
                    });
                    return map;
                }

                // SINGLE → return single URL (unchanged behavior)
                const item = combined.find(d => d.targetId == universeIds);
                if (item && item.imageUrl) {
                    ConsoleLogEnabled(`Game icon URL for universe ${universeIds}: ${item.imageUrl}`);
                    return item.imageUrl;
                }

                throw new Error("Image URL not found in response.");
            });
    }

    /*******************************************************
    name of function: getGameDetailsBatch
    description: gets game details
    *******************************************************/
    async function getGameDetailsBatch(universeIds) {
        // im to lazy to refactor the entire feature to adapt to the new batch so we gotta do this instead.
        const single = !Array.isArray(universeIds);
        if (single) universeIds = [universeIds];

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: `https://games.roblox.com/v1/games?universeIds=${universeIds.join(',')}`,
                headers: { "Accept": "application/json" },
                onload: function(response) {
                    if (response.status === 200) {
                        try {
                            const data = JSON.parse(response.responseText);
                            if (single) {
                                resolve(data.data && data.data.length > 0 ? data.data[0] : null);
                            } else {
                                const map = {};
                                data.data.forEach(game => { map[game.id] = game; });
                                resolve(map);
                            }
                        } catch (e) { reject(e); }
                    } else {
                        reject(new Error(`HTTP ${response.status}`));
                    }
                },
                onerror: reject
            });
        });
    }

    /*******************************************************
    name of function: getGameVotesFromUniverseId
    description: gets game vots/likes/dislikes
    *******************************************************/
    function getGameVotesFromUniverseId(universeIds) {
        const isSingle = !Array.isArray(universeIds);
        const idsArray = isSingle ? [universeIds] : universeIds;

        // Split into chunks of 10
        const chunkSize = 10;
        const chunks = [];
        for (let i = 0; i < idsArray.length; i += chunkSize) {
            chunks.push(idsArray.slice(i, i + chunkSize));
        }

        // Helper to fetch one chunk
        function fetchChunk(chunk) {
            const apiUrl = `https://games.roblox.com/v1/games/votes?universeIds=${chunk.join(",")}`;

            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: apiUrl,
                    headers: {
                        "Accept": "application/json"
                    },
                    onload: function(response) {
                        if (response.status === 200) {
                            try {
                                const data = JSON.parse(response.responseText);
                                resolve(data.data || []);
                            } catch (err) {
                                reject(err);
                            }
                        } else {
                            reject(new Error(`HTTP error! Status: ${response.status}`));
                        }
                    },
                    onerror: reject
                });
            });
        }

        // Run all chunk requests
        return Promise.all(chunks.map(fetchChunk))
            .then(results => {
                const combined = results.flat();

                if (combined.length === 0) {
                    throw new Error("No data returned.");
                }

                // MULTIPLE → return map
                if (!isSingle) {
                    const map = {};
                    combined.forEach(item => {
                        map[item.id] = {
                            upVotes: item.upVotes,
                            downVotes: item.downVotes
                        };
                    });
                    return map;
                }

                // SINGLE → return one object (backward compatible)
                const item = combined.find(d => d.id == universeIds);
                if (item) {
                    ConsoleLogEnabled(`Votes for universe ${universeIds}: 👍 ${item.upVotes} | 👎 ${item.downVotes}`);
                    return {
                        upVotes: item.upVotes,
                        downVotes: item.downVotes
                    };
                }

                throw new Error("Votes not found in response.");
            });
    }

    /*******************************************************
    name of function: fetchPlayerThumbnailsBatch
    description: gets player thumbnails
    *******************************************************/
    async function fetchPlayerThumbnailsBatch(userIds) {
        if (!userIds.length) return [];
        const params = new URLSearchParams({userIds: userIds.join(","), size: "150x150", format: "Png", isCircular: "false"});
        const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?${params.toString()}`;
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET", url: url, headers: {"Accept": "application/json"},
                onload: function(response) {
                    try {
                        if (response.status === 200) resolve(JSON.parse(response.responseText).data || []);
                        else resolve([]);
                    } catch (error) { resolve([]); }
                },
                onerror: function() { resolve([]); }
            });
        });
    }

    /*******************************************************
    name of function: fetchGroupIconsBatch
    description: gets group icons. Taken from smartsearch function for later use
    *******************************************************/
    async function fetchGroupIconsBatch(groupIds) {
        if (!groupIds.length) return [];
        const params = new URLSearchParams({groupIds: groupIds.join(","), size: "150x150", format: "Png", isCircular: "false"});
        const url = `https://thumbnails.roblox.com/v1/groups/icons?${params.toString()}`;
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET", url: url, headers: {"Accept": "application/json"},
                onload: function(response) {
                    try {
                        if (response.status === 200) resolve(JSON.parse(response.responseText).data || []);
                        else resolve([]);
                    } catch (error) { resolve([]); }
                },
                onerror: function() { resolve([]); }
            });
        });
    }

    /*******************************************************
    name of function: fetchPlayerThumbnails
    description: gets player thumbnails on player tokens from server api.
    if quick the it skips queue etc
    *******************************************************/
    const fetchPlayerThumbnails = (() => {
        const queue = [];
        let processing = false;
        return async function(playerTokens, quick = false) {
            ConsoleLogEnabled("Function called with playerTokens:", playerTokens);

            const body = (quick ? playerTokens.slice(0, 5) : playerTokens).map(token => ({
                requestId: `0:${token}:AvatarHeadshot:150x150:png:regular`,
                type: "AvatarHeadShot",
                targetId: 0,
                token,
                format: "png",
                size: "150x150",
            }));

            // --- QUICK MODE ---
            if (quick) {
                return new Promise((resolve) => {
                    GM_xmlhttpRequest({
                        method: "POST",
                        url: "https://thumbnails.roblox.com/v1/batch",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        data: JSON.stringify(body),
                        onload: function(response) {
                            try {
                                if (response.status >= 200 && response.status < 300) {
                                    const data = JSON.parse(response.responseText);
                                    resolve(data.data || []);
                                } else {
                                    ConsoleLogEnabled(`HTTP error! Status: ${response.status}`);
                                    resolve([]);
                                }
                            } catch (error) {
                                ConsoleLogEnabled('Error parsing batch thumbnail response:', error);
                                resolve([]);
                            }
                        },
                        onerror: function(err) {
                            ConsoleLogEnabled('Request error fetching batch thumbnails:', err);
                            resolve([]);
                        }
                    });
                });
            }

            // --- NORMAL (QUEUE) MODE ---
            const waitHalfSecond = (ms = 250) => new Promise(res => setTimeout(res, ms));
            return new Promise(resolve => {
                ConsoleLogEnabled("Pushing to queue:", playerTokens);
                queue.push({ playerTokens, resolve });
                const processQueue = async () => {
                    if (processing) {
                        ConsoleLogEnabled("Already processing, exiting...");
                        return;
                    }
                    processing = true;
                    ConsoleLogEnabled("Started processing queue...");
                    while (queue.length > 0) {
                        const { playerTokens, resolve } = queue.shift();
                        ConsoleLogEnabled("Processing batch:", playerTokens);
                        const body = playerTokens.map(token => ({
                            requestId: `0:${token}:AvatarHeadshot:150x150:png:regular`,
                            type: "AvatarHeadShot",
                            targetId: 0,
                            token,
                            format: "png",
                            size: "150x150",
                        }));
                        let success = false;
                        let data = [];
                        while (!success) {
                            ConsoleLogEnabled("Sending request to thumbnails.roblox.com...");
                            const response = await fetch("https://thumbnails.roblox.com/v1/batch", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    Accept: "application/json",
                                },
                                body: JSON.stringify(body),
                            });
                            ConsoleLogEnabled("Response status:", response.status);
                            if (response.status === 429) {
                                ConsoleLogEnabled("Rate limited. Waiting...");
                                await waitHalfSecond();
                            } else {
                                const json = await response.json();
                                data = json.data || [];
                                success = true;
                                ConsoleLogEnabled("Received data:", data);
                            }
                        }
                        resolve(data);
                        ConsoleLogEnabled("Resolved promise with data");
                    }
                    processing = false;
                    ConsoleLogEnabled("Finished processing queue.");
                };
                processQueue();
            });
        };
    })();

    /*******************************************************
    name of function: fetchCatalogItemDetails
    description: gets stats for a catalog item
    *******************************************************/
    async function fetchCatalogItemDetails(assetId) {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: `https://catalog.roblox.com/v1/catalog/items/${assetId}/details?itemType=Asset`,
                headers: {"Accept": "application/json"},
                onload: function(response) {
                    if (response.status === 200) {
                        try { resolve(JSON.parse(response.responseText)); }
                        catch (e) { resolve(null); }
                    } else resolve(null);
                },
                onerror: function() { resolve(null); }
            });
        });
    }

    /*******************************************************
    name of function: fetchCatalogThumbnailsBatch
    description: gets the icons for catalog items
    *******************************************************/
    async function fetchCatalogThumbnailsBatch(assetIds) {
        if (!assetIds.length) return [];
        const params = new URLSearchParams({assetIds: assetIds.join(","), size: "150x150", format: "png", isCircular: "false"});
        const url = `https://thumbnails.roblox.com/v1/assets?${params.toString()}`;
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET", url: url, headers: {"Accept": "application/json"},
                onload: function(response) {
                    try {
                        if (response.status === 200) resolve(JSON.parse(response.responseText).data || []);
                        else resolve([]);
                    } catch (error) { resolve([]); }
                },
                onerror: function() { resolve([]); }
            });
        });
    }

    /*******************************************************
    name of function: fetchBundleThumbnailsBatch
    description: gets the thumbnails in a bundle
    *******************************************************/
    async function fetchBundleThumbnailsBatch(bundleIds) {
        if (!bundleIds.length) return [];
        const params = new URLSearchParams({bundleIds: bundleIds.join(","), size: "150x150", format: "png", isCircular: "false"});
        const url = `https://thumbnails.roblox.com/v1/bundles/thumbnails?${params.toString()}`;
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET", url: url, headers: {"Accept": "application/json"},
                onload: function(response) {
                    try {
                        if (response.status === 200) resolve(JSON.parse(response.responseText).data || []);
                        else resolve([]);
                    } catch (error) { resolve([]); }
                },
                onerror: function() { resolve([]); }
            });
        });
    }

    //---------------Gets the users stats from apis--------------------
    /*******************************************************
    name of function: fetchUserDataBatch
    description: fetches all user data needed for banned user display or something else in the future
    *******************************************************/
    async function fetchUserStatsBatch(userId, mode) {
        const gmFetch = url => new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET", url,
                headers: { "Accept": "application/json" },
                onload: r => { try { resolve(JSON.parse(r.responseText)); } catch { resolve(null); } },
                onerror: () => resolve(null),
            });
        });

       // for smartsearch we only send two requests yea. im master at optimization
       if (mode === "smartsearch") return Promise.all([
            gmFetch(`https://friends.roblox.com/v1/users/${userId}/friends/count`),
            gmFetch(`https://friends.roblox.com/v1/users/${userId}/followers/count`),
        ]);

        // yea for banned users here. used for banned users for now
        const [userInfo, friendCount, followerCount, followingCount, favoriteGames] = await Promise.all([
            gmFetch(`https://users.roblox.com/v1/users/${userId}`),
            gmFetch(`https://friends.roblox.com/v1/users/${userId}/friends/count`),
            gmFetch(`https://friends.roblox.com/v1/users/${userId}/followers/count`),
            gmFetch(`https://friends.roblox.com/v1/users/${userId}/followings/count`),
            gmFetch(`https://games.roblox.com/v2/users/${userId}/favorite/games`),
        ]);

        return {
            userInfo,
            friendCount:   friendCount?.count   ?? 0,
            followerCount: followerCount?.count  ?? 0,
            followingCount: followingCount?.count ?? 0,
            favoriteGames:  favoriteGames?.data  ?? [],
        };
    }
    //---------------End of Gets the users stats from apis--------------------

    /*******************************************************
    name of function: notifications
    description: notifications function (XSS-safe)
    *******************************************************/
    function notifications(message, type = 'info', emoji = '', duration = 3000) {
        if (localStorage.getItem('ROLOCATE_enablenotifications') !== 'true') return;

        if (!document.getElementById('toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.innerHTML = `
        @keyframes slideIn { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100%); } }
        @keyframes shrink { from { width: 100%; } to { width: 0%; } }

        #toast-container {
            position: fixed; top: 20px; right: 20px; z-index: 999999999999999999;
            display: flex; flex-direction: column; gap: 8px; pointer-events: none;
        }

        .toast {
            background: #2d2d2d; color: #e8e8e8; padding: 12px 16px; border-radius: 8px;
            font: 500 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            min-width: 280px; max-width: 400px; border: 1px solid rgba(255,255,255,0.15);
            box-shadow: 0 4px 12px rgba(0,0,0,0.25); animation: slideIn 0.3s ease-out;
            pointer-events: auto; position: relative; overflow: hidden; will-change: transform;
        }

        .toast.removing { animation: slideOut 0.3s ease-in forwards; }
        .toast:hover { background: #373737; }

        .toast-content { display: flex; align-items: center; gap: 10px; }
        .toast-icon { width: 16px; height: 16px; flex-shrink: 0; }
        .toast-emoji { font-size: 16px; flex-shrink: 0; }
        .toast-message { flex: 1; line-height: 1.4; white-space: pre-wrap; }

        .toast-close {
            position: absolute; top: 4px; right: 6px; width: 20px; height: 20px;
            cursor: pointer; opacity: 0.6; display: flex; align-items: center;
            justify-content: center; border-radius: 4px; transition: opacity 0.2s;
        }
        .toast-close:hover { opacity: 1; background: rgba(255,255,255,0.1); }
        .toast-close::before, .toast-close::after {
            content: ''; position: absolute; width: 10px; height: 1px; background: #ccc;
        }
        .toast-close::before { transform: rotate(45deg); }
        .toast-close::after { transform: rotate(-45deg); }

        .progress-bar {
            position: absolute; bottom: 0; left: 0; height: 2px;
            background: rgba(255,255,255,0.25); animation: shrink linear forwards;
        }

        .toast.success { border-left: 3px solid #4CAF50; }
        .toast.error { border-left: 3px solid #F44336; }
        .toast.warning { border-left: 3px solid #FF9800; }
        .toast.info { border-left: 3px solid #2196F3; }
        `;
            document.head.appendChild(style);
        }

        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        const validTypes = ['success', 'error', 'warning', 'info'];
        const safeType = validTypes.includes(type) ? type : 'info';
        toast.className = `toast ${safeType}`;

        const icons = {
            success: '<svg width="18" height="18" fill="none" stroke="#4CAF50" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#4CAF50" opacity=".1"/><path d="M8 12.5l3 3 5-6"/></svg>',
            error: '<svg width="18" height="18" fill="none" stroke="#f44336" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#f44336" opacity=".1"/><path d="m15 9-6 6m0-6 6 6"/></svg>',
            warning: '<svg width="18" height="18" fill="none" stroke="#ff9800" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path fill="#ff9800" opacity=".1" d="M12 2 2 20h20z"/><path d="M12 2 2 20h20zm0 7v5m0 3h.01"/></svg>',
            info: '<svg width="18" height="18" fill="none" stroke="#2196f3" stroke-width="2.5" stroke-linecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#2196f3" opacity=".1"/><circle cx="12" cy="12" r="10"/><path d="M12 11v6m0-9h.01"/></svg>'
        };

        // escape the user input sduyhgads
        const safeMessage = escapeHtmlnoxssattackvectors(message);
        const safeEmoji = escapeHtmlnoxssattackvectors(emoji);

        toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-icon">${icons[safeType]}</div>
            ${emoji ? `<span class="toast-emoji">${safeEmoji}</span>` : ''}
            <span class="toast-message">${safeMessage.replace(/\n/g, '<br>')}</span>
        </div>
        <div class="toast-close"></div>
        <div class="progress-bar" style="animation-duration: ${parseInt(duration)}ms;"></div>
    `;

        container.appendChild(toast);

        let timeout = setTimeout(removeToast, duration);
        const progressBar = toast.querySelector('.progress-bar');

        toast.addEventListener('mouseenter', () => {
            progressBar.style.animationPlayState = 'paused';
            clearTimeout(timeout);
        });

        toast.addEventListener('mouseleave', () => {
            progressBar.style.animationPlayState = 'running';
            const remaining = (progressBar.offsetWidth / toast.offsetWidth) * duration;
            timeout = setTimeout(removeToast, remaining);
        });

        toast.querySelector('.toast-close').addEventListener('click', removeToast);

        function removeToast() {
            clearTimeout(timeout);
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }

        return {
            remove: removeToast,
            update: (newMessage) => {
                const escaped = escapeHtmlnoxssattackvectors(newMessage);
                toast.querySelector('.toast-message').innerHTML = escaped.replace(/\n/g, '<br>');
            },
            setType: (newType) => {
                const validType = validTypes.includes(newType) ? newType : 'info';
                toast.className = `toast ${validType}`;
                toast.querySelector('.toast-icon').innerHTML = icons[validType];
            },
            setDuration: (newDuration) => {
                clearTimeout(timeout);
                const safeDuration = parseInt(newDuration);
                progressBar.style.animation = `shrink ${safeDuration}ms linear forwards`;
                timeout = setTimeout(removeToast, safeDuration);
            },
            updateEmoji: (newEmoji) => {
                const emojiEl = toast.querySelector('.toast-emoji');
                if (emojiEl) emojiEl.textContent = escapeHtmlnoxssattackvectors(newEmoji);
            }
        };
    }

    function Update_Popup() {
        localStorage.removeItem('ROLOCATE_compactprivateservers');
        localStorage.removeItem('ROLOCATE_mutualfriends');

        const VERSION = "V46.5", PREV_VERSION = "V45.5";
        const changelog = {
            BetterProfileInfo: ["🧑‍💻","Better Profile Info","Replaces Mutual Friends; adds detailed stats like mutuals, followers, and following.","New"],
            PrivateServerSearch:["🔎","Private Server Search","Search your friends' private servers (may be slightly buggy).","New"],
            StatusControls:     ["🟢","Status & Join Controls","Change online status and game join status via Show Old Greeting.","New"],
            PlaytimeStats:      ["⏱️","Playtime & RoPro","View weekly playtime and RoPro compatibility via Show Old Greeting.","New"],
            BestFriendsUI:      ["👥","Best Friends Improvements","Hover dropdown added and popup loads faster.","Improved"],
            CustomBackgrounds:  ["🎨","Custom Backgrounds","More customization options added, plus presets for easier setup.","Improved"],
            Adblocker:          ["🏠","Remove All Roblox Ads","Option to hide Standout Games section.","Improved"],
            SmartSearchUpdate:  ["🔍","Smart Search","Prioritizes exact usernames (friends first) and shows banned users.","Improved"],
            BugFixes:           ["🛠️","Bug Fixes","Fixed trailer autoplay, Best Friends (BTR/RoSeal), server filter (BTR), and old greeting issues.","Fixed"],
            RemovedFeature:     ["🗑️","Removed Feature","Mutual Friends removed and replaced by Better Profile Info.","Removed"],
            MoreInfo:           ["✨","More Info","For full details, view the complete changelog here.","Info","https://oqarshi.github.io/Invite/rolocate/changelog/"]
        };

        const cur = localStorage.getItem('version') || "V0.0";
        if (cur === VERSION) return;
        localStorage.setItem('version', VERSION);
        if (localStorage.getItem(PREV_VERSION)) localStorage.removeItem(PREV_VERSION);

        const s = document.createElement('style');
        s.innerHTML = `
.rup-popup {
    display: flex;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    justify-content: center;
    align-items: center;
    z-index: 1000;
    animation: rup-in 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
    opacity: 0;
}
.rup-content {
    background: #2a2a2a;
    border-radius: 20px;
    width: 650px;
    max-width: 95%;
    max-height: 85vh;
    overflow: hidden;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
    border: 1px solid #404040;
    color: #e8e8e8;
    display: flex;
    flex-direction: column;
    animation: rup-up 0.6s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
    transform: scale(0.95);
}
.rup-header {
    padding: 24px 32px;
    border-bottom: 1px solid #404040;
    display: flex;
    align-items: flex-start;
    gap: 16px;
    background: #1f1f1f;
    position: relative;
}
.rup-logo {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    flex-shrink: 0;
}
.rup-title {
    font-size: 24px;
    font-weight: 600;
    color: #fff;
    margin: 0 0 4px;
    letter-spacing: -0.5px;
}
.rup-version {
    display: inline-block;
    background: #1a1a1a;
    color: #fff;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    border: 1px solid #404040;
}
.rup-refresh-btn {
    background: #3a3a3a;
    color: #e8e8e8;
    border: 1px solid #505050;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    position: absolute;
    top: 16px;
    right: 16px;
    transition: background 0.15s;
}
.rup-refresh-btn:hover {
    background: #454545;
}
.rup-refresh-btn:active {
    background: #555;
    transform: scale(0.96);
    transition:
        transform 0.08s,
        background 0.08s;
}
.rup-main {
    padding: 24px 32px;
    overflow-y: auto;
    background: #252525;
    flex: 1;
}
.rup-main::-webkit-scrollbar {
    width: 6px;
}
.rup-main::-webkit-scrollbar-track {
    background: #1a1a1a;
}
.rup-main::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 3px;
}
.rup-main::-webkit-scrollbar-thumb:hover {
    background: #666;
}
.rup-top {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
}
.rup-devmsg {
    background: #1a1a1a;
    border-radius: 8px;
    padding: 16px;
    border-left: 3px solid #555;
    flex: 1;
}
.rup-devmsg b {
    display: block;
    color: #fff;
    margin-bottom: 8px;
    font-size: 14px;
}
.rup-devmsg p {
    font-size: 13px;
    color: #ccc;
    line-height: 1.5;
    margin: 0;
}
.rup-help {
    background: #1a1a1a;
    border-radius: 8px;
    padding: 16px;
    border: 1px solid #404040;
    min-width: 200px;
}
.rup-help b {
    display: block;
    font-size: 14px;
    color: #fff;
    margin-bottom: 12px;
}
.rup-link {
    color: #70a5ff;
    text-decoration: none;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 6px;
    background: rgba(112, 165, 255, 0.1);
    border: 1px solid rgba(112, 165, 255, 0.2);
    margin-bottom: 8px;
    transition: all 0.2s;
}
.rup-link:last-child {
    margin-bottom: 0;
}
.rup-link:hover {
    color: #fff;
    background: rgba(112, 165, 255, 0.2);
    border-color: rgba(112, 165, 255, 0.4);
    transform: translateX(2px);
}
.rup-ftitle {
    font-size: 18px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 16px;
}
.rup-feat {
    margin-bottom: 12px;
    border-radius: 10px;
    padding: 16px;
    background: #1f1f1f;
    border: 1px solid #404040;
    transition: all 0.2s;
}
.rup-feat:hover {
    border-color: #555;
    background: #2a2a2a;
    transform: translateY(-2px);
}
.rup-feat-hd {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
}
.rup-feat-hd span:first-child {
    font-size: 20px;
    min-width: 24px;
}
.rup-feat-hd div {
    flex: 1;
    font-size: 15px;
    font-weight: 500;
    color: #fff;
}
.rup-badge {
    background: #404040;
    color: #ccc;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.rup-feat p {
    font-size: 14px;
    color: #aaa;
    line-height: 1.5;
    margin: 0;
}
.rup-feat a {
    display: inline-block;
    margin-top: 8px;
    color: #70a5ff;
    text-decoration: none;
    font-size: 13px;
    transition: all 0.2s;
}
.rup-feat a:hover {
    color: #90b5ff;
    transform: translateX(2px);
}
.rup-footer {
    padding: 20px 32px;
    border-top: 1px solid #404040;
    background: #1f1f1f;
    text-align: center;
}
.rup-footer p {
    font-size: 12px;
    color: #999;
    margin: 0;
}
@keyframes rup-in {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}
@keyframes rup-up {
    0% {
        transform: scale(0.95) translateY(10px);
    }
    100% {
        transform: scale(1) translateY(0);
    }
}
@media (max-width: 768px) {
    .rup-content {
        width: 95%;
    }
    .rup-top {
        flex-direction: column;
    }
    .rup-help {
        min-width: auto;
    }
}
`;
        document.head.appendChild(s);

        const feats = Object.values(changelog).map(([icon, title, desc, badge, link]) => `
            <div class="rup-feat">
                <div class="rup-feat-hd"><span>${icon}</span><div>${title}</div><span class="rup-badge">${badge}</span></div>
                <p>${desc}</p>
                ${link ? `<a href="${link}" target="_blank">${link}</a>` : ''}
            </div>`).join('');

        const el = document.createElement('div');
        el.innerHTML = `
            <div class="rup-popup">
                <div class="rup-content">
                    <div class="rup-header">
                        <img class="rup-logo" src="${window.Base64Images.logo}" alt="Rolocate Logo">
                        <div><h1 class="rup-title">Rolocate Update</h1><div class="rup-version">${VERSION}</div></div>
                        <button class="rup-refresh-btn" onclick="location.reload()">Exit (Refresh) <span style="font-size:16px">✕</span></button>
                    </div>
                    <div class="rup-main">
                        <div class="rup-top">
                            <div class="rup-devmsg">
                                <b>From Oqarshi:</b>
                                <p>Please report any issues on GreasyFork if something breaks! Thank you! RoLocate is designed to be used with Roblox's dark mode or dark theme.</p>
                            </div>
                            <div class="rup-help">
                                <b>Need Help?</b>
                                <a href="https://oqarshi.github.io/Invite/rolocate/docs/" target="_blank" class="rup-link"><span>📖</span><span>Documentation</span></a>
                                <a href="https://greasyfork.org/en/scripts/523727-rolocate/feedback" target="_blank" class="rup-link"><span>🛡️</span><span>Support</span></a>
                            </div>
                        </div>
                        <div class="rup-ftitle">✨ What's New in ${VERSION}</div>
                        ${feats}
                    </div>
                    <div class="rup-footer"><p>This notification will not appear again until the next version release.</p></div>
                </div>
            </div>`;
        document.body.appendChild(el);
    }


    // default settings.
    const defaultSettings = {
        enableLogs: false, removeads: true, togglefilterserversbutton: true,
        toggleserverhopbutton: true, AutoRunServerRegions: false, ShowOldGreeting: true,
        togglerecentserverbutton: true, prioritylocation: "automatic", fastservers: true,
        invertplayercount: false, enablenotifications: true, disabletrailer: true,
        gamequalityfilter: false, loadbetterprofileinfo: true, disablechat: false,
        smartsearch: true, quicklaunchgames: true, smartjoinpopup: true,
        betterfriends: true, restoreclassicterms: true, betterprivateservers: true,
        custombackgrounds: false, btrobloxfix: false, mobilemode: false,
        joinconfirmation: true, forcedarkmode: false, responsivegamecards: true,
        bettergamestats: false
    };

    // presets in settings
    const presetConfigurations = {
      default: { name: "Default", settings: {} },
      mobilesettings: { name: "Mobile Settings", settings: {"loadbetterprofileinfo": false, "disablechat": true, "smartjoinpopup": false, "mobilemode": true, "responsivegamecards": false} },
      developerpref: { name: "Dev Settings", settings: {"enableLogs": true, "disablechat": true, "bettergamestats": true} },
      serverfiltersonly: { name: "Server Filters Only", settings: {"removeads": false, "toggleserverhopbutton": false, "ShowOldGreeting": false, "togglerecentserverbutton": false, "disabletrailer": false, "loadbetterprofileinfo": false, "smartsearch": false, "quicklaunchgames": false, "betterfriends": false, "restoreclassicterms": false, "betterprivateservers": false, "responsivegamecards": false} },
      smartsearchonly: { name: "Smart Search Only", settings: {"removeads": false, "togglefilterserversbutton": false, "toggleserverhopbutton": false, "ShowOldGreeting": false, "togglerecentserverbutton": false, "fastservers": false, "disabletrailer": false, "loadbetterprofileinfo": false, "quicklaunchgames": false, "smartjoinpopup": false, "betterfriends": false, "restoreclassicterms": false, "betterprivateservers": false, "joinconfirmation": false, "responsivegamecards": false} },
      disablerolocate: { name: "Disable RoLocate", settings: {"removeads": false, "togglefilterserversbutton": false, "toggleserverhopbutton": false, "ShowOldGreeting": false, "togglerecentserverbutton": false, "fastservers": false, "disabletrailer": false, "loadbetterprofileinfo": false, "smartsearch": false, "quicklaunchgames": false, "smartjoinpopup": false, "betterfriends": false, "restoreclassicterms": false, "betterprivateservers": false, "joinconfirmation": false, "responsivegamecards": false} },
    };

    function initializeLocalStorage() {
        // this loops through the settings and if they dont exist then add them
        Object.entries(defaultSettings).forEach(([key, value]) => {
            const storageKey = `ROLOCATE_${key}`;
            if (localStorage.getItem(storageKey) === null) {
                localStorage.setItem(storageKey, value);
            }
        });
    }


    /*******************************************************
    name of function: initializeCoordinatesStorage
    description: finds coordinates
    *******************************************************/
    function initializeCoordinatesStorage() {
        // coors alredyt in there
        try {
            const storedCoords = GM_getValue("ROLOCATE_coordinates");
            if (!storedCoords) {
                // make empty
                GM_setValue("ROLOCATE_coordinates", JSON.stringify({
                    lat: "",
                    lng: ""
                }));
            } else {
                // yea
                const parsedCoords = JSON.parse(storedCoords);
                if ((!parsedCoords.lat || !parsedCoords.lng) && localStorage.getItem("ROLOCATE_prioritylocation") === "manual") {
                    // if manual mode but no coordinates, revert to automatic
                    localStorage.setItem("ROLOCATE_prioritylocation", "automatic");
                }
            }
        } catch (error) {
            ConsoleLogEnabled("Error initializing coordinates storage:", error);
            // used like the userscript manager storage (cannot be accessed by other extensions) to store coordinates.
            GM_setValue("ROLOCATE_coordinates", JSON.stringify({
                lat: "",
                lng: ""
            }));
        }
    }

    /*******************************************************
    name of function: getSettingsContent
    description: adds section to settings page
    *******************************************************/
    function getSettingsContent(section) {
        if (section === "home") {
            return `
        <div class="home-section">
            <div style="display:flex;align-items:center;justify-content:center;gap:18px;margin-bottom:4px;">
                <img class="rolocate-logo" src="${window.Base64Images.logo}" alt="ROLOCATE Logo" style="margin:0;">
                <div style="text-align:left;">
                    <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:0.5px;line-height:1.1;">RoLocate</div>
                    <div style="margin-top:8px;display:inline-block;background:rgba(220,53,69,0.08);border:1.5px solid rgba(220,53,69,0.35);padding:3px 10px;border-radius:8px;">
                        <span style="font-size:13px;font-weight:700;color:#e8566a;letter-spacing:1.5px;">V 46.5</span>
                    </div>
                </div>
            </div>
            <div class="section-separator"></div>
            <p>Rolocate by Oqarshi.</p>
            <p class="license-note">
                Licensed under a <strong>Custom License – Personal Use Only</strong>. No redistribution.
            </p>
            <div class="home-links">
                <a class="home-link-btn github-greasyfork-btn" href="https://github.com/Oqarshi/RoLocate" target="_blank">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    View on GitHub
                </a>
                <a class="home-link-btn github-greasyfork-btn" href="https://greasyfork.org/en/scripts/523727-rolocate" target="_blank">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5.89 2.227a0.28 0.28 0 0 1 0.266 0.076l5.063 5.062c0.54 0.54 0.509 1.652 -0.031 2.192l8.771 8.77c1.356 1.355 -0.36 3.097 -1.73 1.728l-8.772 -8.77c-0.54 0.54 -1.651 0.571 -2.191 0.031l-5.063 -5.06c-0.304 -0.304 0.304 -0.911 0.608 -0.608l3.714 3.713L7.59 8.297 3.875 4.582c-0.304 -0.304 0.304 -0.911 0.607 -0.607l3.715 3.714 1.067 -1.066L5.549 2.91c-0.228 -0.228 0.057 -0.626 0.342 -0.683ZM12 0C5.374 0 0 5.375 0 12s5.374 12 12 12c6.625 0 12 -5.375 12 -12S18.625 0 12 0Z"/></svg>
                    View on GreasyFork
                </a>
            </div>
        </div>
    `;
        }


        if (section === "presets") {
            return `
                <div class="presets-section">
                    <div class="presets-actions">
                        <button id="export-settings" class="preset-btn export-btn">📤 Export Settings</button>
                        <button id="import-settings" class="preset-btn import-btn">📥 Import Settings</button>
                        <input type="file" id="import-file" accept=".json" style="display: none;">
                    </div>
                    <div class="section-separator"></div>
                    <p>Overwhelmed by the number of features? Pick a preset right here!</p>
                    <div class="section-separator"></div>
                    <h3 class="grayish-center">Built-in Presets</h3>
                    <div class="presets-grid">
                        <div class="preset-card" data-preset="default">
                            <h4>🛠️ Default</h4>
                            <p>Default settings that RoLocate comes with.</p>
                        </div>
                        <div class="preset-card" data-preset="mobilesettings">
                            <h4>📱 Mobile Settings</h4>
                            <p>Optimized for Mobile Users.</p>
                        </div>
                        <div class="preset-card" data-preset="developerpref">
                            <h4>👑 Dev Settings</h4>
                            <p>Settings used by the developer Oqarshi.</p>
                        </div>
                        <div class="preset-card" data-preset="serverfiltersonly">
                            <h4>🌍 Server Filters</h4>
                            <p>Only Enables Server Filters.</p>
                        </div>
                        <div class="preset-card" data-preset="smartsearchonly">
                            <h4>🧠 Smart Search</h4>
                            <p>Only Enables Smart Seach.</p>
                        </div>
                        <div class="preset-card" data-preset="disablerolocate">
                            <h4>🚫 RoLocate Off </h4>
                            <p>Turns off all settings.</p>
                        </div>
                    </div>
                </div>
            `;
        }

        if (section === "appearance") {
            return `
        <div class="appearance-section">
            <span class="appearance_section">Visual settings 🎨🖌️</span>

            <label class="toggle-slider">
                <input type="checkbox" id="disabletrailer">
                <span class="slider"></span>
                Disable Trailer Autoplay
                <span class="help-icon" data-help="Disable Trailer Autoplay">?</span>
            </label>

            <label class="toggle-slider">
                <input type="checkbox" id="smartjoinpopup">
                <span class="slider"></span>
                Smart Join Popup
                <span class="help-icon" data-help="Smart Join Popup">?</span>
            </label>

            <label class="toggle-slider">
                <input type="checkbox" id="removeads">
                <span class="slider"></span>
                Remove All Roblox Ads
                <button id="edit-removeads-btn" class="edit-button" type="button" style="display: none;">Edit</button>
                <span class="help-icon" data-help="Remove All Roblox Ads">?</span>
            </label>

            <label class="toggle-slider">
                <input type="checkbox" id="restoreclassicterms">
                <span class="slider"></span>
                Restore Classic Terms
                <span class="help-icon" data-help="Restore Classic Terms">?</span>
            </label>

            <label class="toggle-slider new_label">
                <input type="checkbox" id="responsivegamecards">
                <span class="slider"></span>
                Responsive Game Cards
                <span class="new">New
                    <span class="tooltip">Just Released/Updated</span>
                </span>
                <span class="help-icon" data-help="Responsive Game Cards">?</span>
            </label>

            <label class="toggle-slider new_label">
                <input type="checkbox" id="betterprivateservers">
                <span class="slider"></span>
                Better Private Servers
                <span class="new">New
                    <span class="tooltip">Just Released/Updated</span>
                </span>
                <button id="edit-betterprivateservers-btn" class="edit-button" type="button" style="display: none;">Edit</button>
                <span class="help-icon" data-help="Better Private Servers">?</span>
            </label>

            <label class="toggle-slider experiment_label">
                <input type="checkbox" id="custombackgrounds">
                <span class="slider"></span>
                Custom Backgrounds
                <span class="experimental">EXP
                    <span class="tooltip">Experimental: Still being tested</span>
                </span>
                <button id="edit-backgrounds-btn" class="edit-button" type="button" style="display: none;">Edit</button>
                <span class="help-icon" data-help="Backgrounds">?</span>
            </label>
        </div>
    `;
        }

        if (section === "advanced") {
            return `
        <div class="advanced-section">
            <span class="warning_advanced">For Experienced Users Only🧠🙃</span>

            <label class="toggle-slider">
                <input type="checkbox" id="enableLogs">
                <span class="slider"></span>
                Enable Console Logs
                <span class="help-icon" data-help="Enable Console Logs">?</span>
            </label>

            <label class="toggle-slider">
                <input type="checkbox" id="togglefilterserversbutton">
                <span class="slider"></span>
                Enable Server Filters
                <button id="edit-serverfilters-btn" class="edit-button" type="button" style="display: none;">Edit</button>
                <span class="help-icon" data-help="Enable Server Filters">?</span>
            </label>

            <label class="toggle-slider">
                <input type="checkbox" id="toggleserverhopbutton">
                <span class="slider"></span>
                Enable Server Hop Button
                <span class="help-icon" data-help="Enable Server Hop Button">?</span>
            </label>

            <label class="toggle-slider">
                <input type="checkbox" id="enablenotifications">
                <span class="slider"></span>
                Enable Notifications
                <span class="help-icon" data-help="Enable Notifications">?</span>
            </label>

            <label class="toggle-slider">
                <input type="checkbox" id="btrobloxfix">
                <span class="slider"></span>
                Fix BTRoblox Compatability
                <span class="help-icon" data-help="Fix BTRoblox">?</span>
            </label>

            <label class="toggle-slider new_label">
                <input type="checkbox" id="mobilemode">
                <span class="slider"></span>
                Mobile Mode
                <a href="https://www.youtube.com/watch?v=gz5SHAro08Q" target="_blank" style="margin-left:8px;color:#4CAF50;text-decoration:underline;cursor:pointer;font-weight:bold;">Video</a>
                <span class="new">New
                    <span class="tooltip">Just Released/Updated</span>
                </span>
                <a class="help-icon" data-help="Mobile Mode">?</a>
            </label>

            <label class="toggle-slider new_label">
                <input type="checkbox" id="forcedarkmode">
                <span class="slider"></span>
                Force Dark Mode Styles
                <span class="new">New
                    <span class="tooltip">Just Released/Updated</span>
                </span>
                <a class="help-icon" data-help="Force Dark Mode Styles">?</a>
            </label>

            <div class="location-settings">
                <div class="setting-header">
                    <span>Set Default Location Mode</span>
                    <span class="help-icon" data-help="Set Default Location Mode">?</span>
                </div>

                <select id="prioritylocation-select">
                    <option value="manual" style="color: rgb(255, 40, 40);">Manual</option>
                    <option value="automatic" style="color: rgb(255, 40, 40);">Automatic</option>
                </select>

                <div id="location-hint">
                    <div><strong>Manual:</strong> Set your location manually below</div>
                    <div><strong>Automatic:</strong> Auto detect your device's location</div>
                </div>

                <div id="manual-coordinates" style="margin-top: 15px; display: none;">
                    <div class="coordinates-inputs" style="display: flex; gap: 10px; margin-bottom: 12px;">
                        <div style="flex: 1;">
                            <label for="latitude" style="display: block; margin-bottom: 8px; font-size: 14px;">Latitude</label>
                            <input type="text" id="latitude" placeholder="e.g. 34.0549"
                                style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05);; background: rgba(255,255,255,0.05); color: #e0e0e0;">
                        </div>
                        <div style="flex: 1;">
                            <label for="longitude" style="display: block; margin-bottom: 8px; font-size: 14px;">Longitude</label>
                            <input type="text" id="longitude" placeholder="e.g. -118.2426"
                                style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05);; background: rgba(255,255,255,0.05); color: #e0e0e0;">
                        </div>
                    </div>
                    <button id="save-coordinates" class="edit-nav-button" style="width: 100%; margin-top: 8px;">
                        Save Coordinates
                    </button>
                    <div class="hint-text" style="margin-top: 12px; font-size: 13px; color: #a0a0a0;">
                        Enter your location's decimal coordinates, or if you're not comfortable sharing them with the script, use the nearest Roblox server coordinates (e.g., Los Angeles: 34.0549, -118.2426).
                    </div>
                </div>
            </div>
        </div>
    `;
        }

        if (section === "extras") {
            return `
        <div class="extras-section">

            <span class="extras_section">Features that might be useful! 💡✨</span>

            <label class="toggle-slider">
                <input type="checkbox" id="gamequalityfilter">
                <span class="slider"></span>
                Game Quality Filter
                <button id="edit-gamequality-btn" class="edit-button" type="button" style="display: none;">Edit</button>
                <span class="help-icon" data-help="Game Quality Filter">?</span>
            </label>

            <label class="toggle-slider new_label">
                <input type="checkbox" id="loadbetterprofileinfo">
                <span class="slider"></span>
                Better Profile Info
                <span class="new">New
                    <span class="tooltip">Just Released/Updated</span>
                </span>
                <span class="help-icon" data-help="Enable Better Profile Info">?</span>
            </label>

            <label class="toggle-slider new_label">
                <input type="checkbox" id="disablechat">
                <span class="slider"></span>
                Disable Chat
                <span class="new">New
                    <span class="tooltip">Just Released/Updated</span>
                </span>
                <span class="help-icon" data-help="Disable Chat">?</span>
            </label>

            <label class="toggle-slider new_label">
                <input type="checkbox" id="quicklaunchgames">
                <span class="slider"></span>
                Quick Launch Games
                <span class="new">New
                    <span class="tooltip">Just Released/Updated</span>
                </span>
                <span class="help-icon" data-help="Quick Launch Games">?</span>
            </label>

            <label class="toggle-slider new_label">
                <input type="checkbox" id="ShowOldGreeting">
                <span class="slider"></span>
                Show Old Greeting
                <span class="new">New
                    <span class="tooltip">Just Released/Updated</span>
                </span>
                <span class="help-icon" data-help="Show Old Greeting">?</span>
            </label>

            <label class="toggle-slider new_label">
                <input type="checkbox" id="betterfriends">
                <span class="slider"></span>
                Better Friends
                <span class="new">New
                    <span class="tooltip">Just Released/Updated</span>
                </span>
                <span class="help-icon" data-help="Better Friends">?</span>
            </label>

        </div>
    `;
        }


        if (section === "about") {
            return `
        <div class="about-section">
            <h3 class="grayish-center">Contributors</h3>
            <p>Special thanks to everyone who has contributed to this project:</p>
            <ul>
                <li><a href="https://www.roblox.com/users/545334824/profile" target="_blank">Oqarshi</a> <span style="color: #888;">• Creator & Maintainer</span></li>
                <li><a href="https://www.roblox.com/users/3795846072/profile" target="_blank">Waivy</a> <span style="color: #888;">• Contributor</span></li>
            </ul>

            <div class="section-separator"></div>

            <p>Resources & Links:</p>
            <ul>
                <li><strong>Developer:</strong> <a href="https://www.roblox.com/users/545334824/profile" target="_blank">Oqarshi</a></li>
                <li><strong>Want to Contribute?:</strong> <a href="https://github.com/Oqarshi/RoLocate" target="_blank">Github</a></li>
                <li><strong>Rolocate Source Code:</strong> <a href="https://greasyfork.org/en/scripts/523727-rolocate/code" target="_blank">GreasyFork</a><a> | </a><a href="https://greasyfork.org/en/scripts/523727-rolocate/code" target="_blank">Github</a></li>
                <li><strong>Invite & FAQ Source Code:</strong> <a href="https://github.com/Oqarshi/Invite" target="_blank">GitHub</a></li>
                <li><strong>Official Website:</strong> <a href="https://oqarshi.github.io/Invite/rolocate/index.html" target="_blank">RoLocate Website</a></li>
                <li><strong>Suggest or Report Issues:</strong> <a href="https://greasyfork.org/en/scripts/523727-rolocate/feedback" target="_blank">Submit Feedback</a></li>
                <li><strong>Inspiration:</strong> <a href="https://chromewebstore.google.com/detail/btroblox-making-roblox-be/hbkpclpemjeibhioopcebchdmohaieln" target="_blank">Btroblox Team</a></li>
            </ul>
        </div>
    `;
        }

        if (section === "technical") {
            // stop it from updating if nothing changed
            let lastRenderedHash = '';
            let storageUpdateInterval;
            const MB = 1024 * 1024;

            // helper to make the storage math
            const getStats = (size, limit) => {
                const mb = (size / MB).toFixed(2);
                const percent = (size / limit) * 100;
                const display = percent >= 0.01 ? `${mb} MB` : `${size.toLocaleString()} bytes`;
                return { size, mb, percent, display };
            };

            function calculateStorages() {
                // calc localstorag size
                let lsSize = 0;
                for (let key in localStorage) {
                    if (localStorage.hasOwnProperty(key)) lsSize += key.length + (localStorage[key]?.length || 0);
                }

                // do the same for gm storage
                let gmSize = 0;
                GM_listValues().forEach(key => {
                    const val = GM_getValue(key, '');
                    gmSize += key.length + (typeof val === 'string' ? val.length : JSON.stringify(val).length);
                });

                return {
                    ls: getStats(lsSize, 5 * MB),
                    gm: getStats(gmSize, 50 * MB)
                };
            }

            // shortcut to update the bars so we dont write this 3 times
            // save some code storage to keep it under 1mb
            const updateBar = (id, percent, colors) => {
                const bar = document.getElementById(`rolocate-${id}-bar`); // this is the bar for the storage
                const txt = document.getElementById(`rolocate-${id}-display`); // this is the display
                if (bar) {
                    bar.style.width = `${Math.min(percent, 100)}%`;
                    bar.style.background = percent > 90 ? colors[0] : percent > 80 ? colors[1] : colors[2];
                }
                return txt;
            };

            function updateAllDisplays() {
                const { ls, gm } = calculateStorages();

                const lsTxt = updateBar('localstorage', ls.percent, ['#f44336', '#ff9800', '#4CAF50']);
                if (lsTxt) lsTxt.textContent = `${ls.display} / 5 MB`;

                const gmTxt = updateBar('gmstorage', gm.percent, ['#f44336', '#ff9800', '#2196F3']);
                if (gmTxt) gmTxt.textContent = `${gm.display} / 50 MB`;

                const logMB = rolocateLogSize / MB;
                const logPercent = (rolocateLogSize / (3 * MB)) * 100;
                const logTxt = updateBar('logstorage', logPercent, ['#f44336', '#ff9800', '#C8A2C8']);
                if (logTxt) logTxt.textContent = `${logMB.toFixed(2)} MB / 3 MB`;

                updateLogDisplay();
            }

            // it updates the log display
            function updateLogDisplay() {
                const logEl = document.getElementById('rolocate-logs');
                if (!logEl) return;

                const allLogs = window.rolocateLogBuffer || [];
                const displayLogs = allLogs.slice(-50);
                const currentHash = displayLogs.length ? `${displayLogs[0].time}-${displayLogs.length}` : 'empty';

                if (currentHash === lastRenderedHash) return;
                lastRenderedHash = currentHash;

                if (!displayLogs.length) {
                    logEl.innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">No Logs. Enable in Advanced Tab.</div>';
                } else {
                    const atBottom = logEl.scrollHeight - logEl.scrollTop <= logEl.clientHeight + 50;
                    logEl.innerHTML = displayLogs.map(l => `
                        <div style="margin-bottom: 6px; padding: 6px 8px; background: #252525; border-radius: 4px; font-family: monospace; font-size: 12px;">
                            <span style="color: #666;">[${l.time}]</span> <span style="color: #4CAF50;">${l.msg}</span>
                        </div>`).join('');
                    if (atBottom) logEl.scrollTop = logEl.scrollHeight;
                }

                const countEl = document.getElementById('rolocate-log-count');
                if (countEl) {
                    countEl.style.display = allLogs.length > 50 ? 'block' : 'none';
                    countEl.textContent = `Showing last 50 of ${allLogs.length} logs`;
                }
            }

            setTimeout(() => {
                updateAllDisplays();

                // buttons logic
                document.getElementById('rolocate-copy-logs-btn')?.addEventListener('click', () => {
                    const text = (window.rolocateLogBuffer || []).map(l => `[${l.time}] ${l.msg}`).join('\n');
                    navigator.clipboard.writeText(text).then(() => notifications(`Copied logs!`, 'success', '', 3000));
                });

                document.getElementById('rolocate-clear-logs-btn')?.addEventListener('click', () => {
                    window.rolocateLogBuffer = [];
                    rolocateLogSize = 0;
                    lastRenderedHash = '';
                    updateAllDisplays();
                    notifications('Logs Cleared!', 'success', '', 3000);
                });

                // the big reset popup
                document.getElementById('rolocate-factory-reset-btn')?.addEventListener('click', () => {
                    const modal = document.createElement('div');
                    modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;justify-content:center;align-items:center;transition: opacity 0.2s ease-out;`;
                    modal.innerHTML = `
                        <div id="rolocate-modal-box" style="background:#1e1e1e;width:320px;padding:24px;border-radius:12px;text-align:center;animation:rolocateFadeIn 0.2s forwards; border: 1px solid #333;">
                            <div style="font-size:32px; margin-bottom: 12px;">⚠️</div>
                            <h3 style="color:#e0e0e0; margin-bottom: 8px;">Factory Reset?</h3>
                            <p style="color:#999;font-size:13px; margin-bottom: 20px;">This will delete all data and reset RoLocate to a fresh install.</p>
                            <div style="display:flex; gap: 10px; justify-content: center;">
                                <button id="cancel-res" style="padding:8px 16px;background:transparent;color:#ccc;border:1px solid #444;border-radius:6px;cursor:pointer;">Cancel</button>
                                <button id="confirm-res" style="padding:8px 16px;background:#d32f2f;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Reset</button>
                            </div>
                        </div>`;
                    document.body.appendChild(modal);

                    // fade in aniamtion
                    const close = () => {
                        document.getElementById('rolocate-modal-box').style.animation = 'rolocateFadeOut 0.2s forwards';
                        modal.style.opacity = '0';
                        setTimeout(() => modal.remove(), 200);
                    };

                    // reset stuff
                    document.getElementById('cancel-res').onclick = close;
                    document.getElementById('confirm-res').onclick = () => {
                        localStorage.removeItem("version"); // remove localstorage version
                        GM_listValues().forEach(localstoragevaluesreset => GM_deleteValue(localstoragevaluesreset)); // delete all gm values in storage
                        notifications('Reset Complete. Refreshing in 2 seconds...', 'warning', '', '2000'); // we do this before resetting settings becasue notifications won't work if we delete settings first
                        Object.keys(localStorage).forEach(localstoragevaluesreset => localstoragevaluesreset.startsWith("ROLOCATE_") && localStorage.removeItem(localstoragevaluesreset)); // delete all localostorage setting keys
                        close(); // close the popup
                        setTimeout(() => location.reload(), 2000); // refresh page in 2 seconds
                    };
                });

                storageUpdateInterval = setInterval(updateAllDisplays, 3000);
            }, 100);

            window.rolocateStorageInterval = storageUpdateInterval;

            return `
                <style>
                  @keyframes rolocateFadeIn {
                    from { opacity: 0; transform: scale(.95); }
                    to   { opacity: 1; transform: scale(1); }
                  }

                  @keyframes rolocateFadeOut {
                    from { opacity: 1; transform: scale(1); }
                    to   { opacity: 0; transform: scale(.95); }
                  }
                </style>
                <div class="about-section">
                    <span class="warning_advanced">Used For Development/Support🔧🧠🙃</span>
                    <h3 class="grayish-center">Script Storage & Console</h3>
                    ${['localstorage', 'gmstorage', 'logstorage'].map(id => `
                        <div style="margin-bottom:20px;padding:12px;background:#1e1e1e;border-radius:8px;border:1px solid #333;">
                            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                                <span style="font-weight:600;font-size:13px;color:#e0e0e0;">${id === 'logstorage' ? 'Console RAM' : id === 'gmstorage' ? 'GM Storage' : 'LocalStorage'}</span>
                                <span id="rolocate-${id}-display" style="font-size:12px;color:#999;"></span>
                            </div>
                            <div style="width:100%;height:6px;background:#2a2a2a;border-radius:3px;overflow:hidden;">
                                <div id="rolocate-${id}-bar" style="width:0;height:100%;transition:width .3s ease;"></div>
                            </div>
                            ${id === 'logstorage' ? '<div style="font-size: 11px; color: #777; margin-top: 4px;">Resets after page refresh</div>' : ''}
                        </div>`).join('')}
                    <div style="margin-bottom:20px;padding:12px;background:#1e1e1e;border-radius:8px;border:1px solid #333;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                            <span style="font-weight:600;font-size:13px;color:#e0e0e0;">Live Console</span>
                            <div style="display:flex;gap:8px;">
                                <button id="rolocate-copy-logs-btn" style="padding:4px 10px;background:#2196F3;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;">Copy</button>
                                <button id="rolocate-clear-logs-btn" style="padding:4px 10px;background:#f44336;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;">Clear</button>
                            </div>
                        </div>
                        <div id="rolocate-log-count" style="display:none;font-size:11px;color:#999;text-align:center;margin-bottom:5px;"></div>
                        <div id="rolocate-logs" style="max-height:200px;overflow-y:auto;background:#0a0a0a;border-radius:4px;padding:8px;"></div>
                    </div>
                    <div style="display:flex; justify-content:center;">
                        <button id="rolocate-factory-reset-btn" style="background:rgba(211,47,47,0.1);color:#ef5350;border:1px solid #ef5350;padding:8px 20px;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;">⚠️ FACTORY RESET</button>
                    </div>
                </div>`;
        }


        if (section === "help") {
            return `
        <div class="help-section">
            <h3 class="grayish-center">⚙️ General Tab</h3>
            <ul>
                <li id="help-Smart Search"><strong>SmartSearch:</strong> <span>Improves the Roblox website’s search bar by enabling instant searches for games, users, and groups.</span></li>
                <li id="help-Auto Server Regions"><strong>Auto Server Regions:</strong> <span>Replaces Roblox's 8 default servers with at least 8 servers, providing detailed info such as location and ping.</span></li>
                <li id="help-Fast Server Search"><strong>Fast Server Search:</strong> <span>Boosts server search speed up to 100x (experimental). Replaces player thumbnails with Builderman/Roblox icons to bypass rate limits.</span></li>
                <li id="help-Invert Player Count"><strong>Invert Player Count:</strong> <span>For server regions: shows low-player servers when enabled, high-player servers when disabled. You can also control this on the Roblox server popup.</span></li>
                <li id="help-Recent Servers"><strong>Recent Servers:</strong> <span>Shows the most recent servers you have joined in the past 3 days.</span></li>
                <li id="help-Join Confirmation"><strong>Join Confirmation:</strong> <span>Shows a popup when the user is trying to join a server/game when the user is already in a game.</span></li>
                <li id="help-Better Game Stats"><strong>Better Game Stats:</strong> <span>For now only shows estimated revenue of a Roblox game. Its in the place where all other stats in games are.</span></li>
            </ul>

            <div class="section-separator"></div>

            <h3 class="grayish-center">🎨 Appearance Tab</h3>
            <ul>
                <li id="help-Disable Trailer Autoplay"><strong>Disable Trailer Autoplay:</strong> <span>Prevents trailers from autoplaying on Roblox game pages.</span></li>
                <li id="help-Smart Join Popup"><strong>Smart Join Popup:</strong> <span>Shows a custom join popup that displays server location about the server before joining it.</span></li>
                <li id="help-Remove All Roblox Ads"><strong>Remove All Roblox Ads:</strong> <span>Blocks most ads on the Roblox site. You can customize what it blocks.</span></li>
                <li id="help-Restore Classic Terms"><strong>Restore Classic Terms:</strong> <span>Reverts corporate buzzwords Roblox has added. Example: “Connections” becomes “Friends”. May not be translated into all languages yet.</span></li>
                <li id="help-Better Private Servers"><strong>Better Private Servers:</strong> <span>Compacts private servers on game pages, so that they do not take up so much space.</span></li>
                <li id="help-Responsive Game Cards"><strong>Responsive Game Cards:</strong> <span>Makes game cards on the website more responsive when hovering over them.</span></li>
                <li id="help-Backgrounds"><strong>Backgrounds:</strong> <span>Allows you to change the background of your roblox page and customize the colors of other stuff on the page. Still very experimental as there could be UI and storage issues.</span></li>
            </ul>

            <div class="section-separator"></div>

            <h3 class="grayish-center">🚀 Advanced Tab</h3>
            <ul>
                <li id="help-Enable Console Logs"><strong>Enable Console Logs:</strong> <span>Enables console.log messages from the script. You can view this in the browser console or under the Technical tab.</span></li>
                <li id="help-Enable Server Filters"><strong>Enable Server Filters:</strong> <span>Enables server filter features on the game page. You can customize what server regions it displays.</span></li>
                <li id="help-Enable Server Hop Button"><strong>Enable Server Hop Button:</strong> <span>Enables server hop feature on the game page.</span></li>
                <li id="help-Enable Notifications"><strong>Enable Notifications:</strong> <span>Enables helpful notifications from the script.</span></li>
                <li id="help-Fix BTRoblox"><strong>Fix Btroblox Compatability:</strong> <span>Uses alternative methods to make the script compatible with BTRoblox.</span></li>
                <li id="help-Mobile Mode"><strong>Mobile Mode:</strong> <span>Allows you to join server regions on mobile devices. May work on other devices that prevent direct joining servers like chromebooks.</span></li>
                <li id="help-Force Dark Mode Styles"><strong>Force Dark Mode Styles:</strong> <span>When enabled, dark mode styles will be used regardless of whether Roblox is in Light or Dark Mode.</span></li>
                <li id="help-Set Default Location Mode"><strong>Set Default Location Mode:</strong> <span>Enables the user to set a default location for Roblox server regions. Turn this on if the script cannot automatically detect your location.</span></li>
            </ul>

            <h3 class="grayish-center">✨ Extra Tab</h3>
            <ul>
                <li id="help-Game Quality Filter"><strong>Game Quality Filter:</strong> <span>Removes games from the charts/discover page based on your settings.</span></li>
                <li id="help-Enable Better Profile Info"><strong>Better Profile Info:</strong> <span>Displays mutual friends, accountage, followers, etc on another users profile page.</span></li>
                <li id="help-Disable Chat"><strong>Disable Chat:</strong> <span>Disables the chat feature on the roblox website.</span></li>
                <li id="help-Quick Launch Games"><strong>Quick Launch Games:</strong> <span>Adds the ability to quickly launch your favorite games from the homepage.</span></li>
                <li id="help-Show Old Greeting"><strong>Show Old Greeting:</strong> <span>Shows the old greeting Roblox had on their home page.</span></li>
                <li id="help-Better Friends"><strong>Better Friends:</strong> <span>Improves the look of the friends section on the homepage and adds Best Friends option.</span></li>
            </ul>
            <div class="section-separator"></div>
            <h3 class="grayish-center">Need more help?</h3>
            <li>
              For help, see the
              <a href="https://oqarshi.github.io/Invite/rolocate/docs/#troubleshooting" target="_blank" class="about-link">troubleshooting</a>
              page or report an issue on
              <a href="https://greasyfork.org/en/scripts/523727-rolocate/feedback" target="_blank" class="about-link">GreasyFork</a>.
            </li>
        </div>
    `;
        }

        // general tab which is the default
        return `
    <div class="general-section">

        <span class="general_section">Common settings in most extensions! ⚙️🔧</span>
        <label class="toggle-slider">
            <input type="checkbox" id="smartsearch">
            <span class="slider"></span>
            SmartSearch
            <span class="help-icon" data-help="Smart Search">?</span>
        </label>

        <label class="toggle-slider new_label">
            <input type="checkbox" id="AutoRunServerRegions">
            <span class="slider"></span>
            Auto Server Regions
            <button id="edit-autoserverregionsbutton-btn" class="edit-button" type="button" style="display: none;">Edit</button>
            <span class="help-icon" data-help="Auto Server Regions">?</span>
        </label>

        <label class="toggle-slider experiment_label">
            <input type="checkbox" id="fastservers">
            <span class="slider"></span>
            Fast Server Search
            <span class="experimental">EXP
                <span class="tooltip">Experimental: Still being tested</span>
            </span>
            <span class="help-icon" data-help="Fast Server Search">?</span>
        </label>

        <label class="toggle-slider">
            <input type="checkbox" id="invertplayercount">
            <span class="slider"></span>
            Invert Player Count
            <span class="help-icon" data-help="Invert Player Count">?</span>
        </label>

        <label class="toggle-slider">
            <input type="checkbox" id="togglerecentserverbutton">
            <span class="slider"></span>
            Recent Servers
            <span class="help-icon" data-help="Recent Servers">?</span>
        </label>

        <label class="toggle-slider new_label">
            <input type="checkbox" id="joinconfirmation">
            <span class="slider"></span>
            Join Confirmation
            <span class="new">New
                <span class="tooltip">Just Released/Updated</span>
            </span>
            <span class="help-icon" data-help="Join Confirmation">?</span>
        </label>

        <label class="toggle-slider new_label">
            <input type="checkbox" id="bettergamestats">
            <span class="slider"></span>
            Better Game Stats
            <span class="new">New
                <span class="tooltip">Just Released/Updated</span>
            </span>
            <button id="edit-bettergamestats-btn" class="edit-button" type="button" style="display: none;">Edit</button>
            <span class="help-icon" data-help="Better Game Stats">?</span>
        </label>
    </div>
`;
    }



    /*******************************************************
    name of function: openSettingsMenu
    description: opens setting menu and makes it look good
    *******************************************************/
    function openSettingsMenu() {
        if (isDarkMode() === false) {
          notifications('You’re using light mode on Roblox. While RoLocate may work, it’s not fully optimized for light mode. For the best experience, please switch to dark mode.', 'info', '📌', 16000);
        }

        if (document.getElementById("userscript-settings-menu")) return;
        // storage make go uyea
        initializeLocalStorage();
        initializeCoordinatesStorage();
        const overlay = document.createElement("div");
        overlay.id = "userscript-settings-menu";
        overlay.innerHTML = `
    <div class="settings-container">
        <button id="close-settings">✖</button>
        <div class="settings-sidebar">
            <h2>RoLocate</h2>
            <div class="search-container">
                <input type="text" id="settings-search" placeholder="🔍 Search settings...">
                <div id="search-suggestions"></div>
            </div>
            <ul>
                <li class="active" data-section="home">🏠 Home</li>
                <li data-section="presets">🧩 Presets</li>
                <li class="section-divider"></li>
                <li data-section="general">⚙️ General</li>
                <li data-section="appearance">🎨 Appearance</li>
                <li data-section="advanced">🧠 Advanced</li>
                <li data-section="extras">✨ Extras</li>
                <li class="section-divider"></li>
                <li data-section="help">❓ Help</li>
                <li data-section="about">📘 About</li>
                <li data-section="technical">🔧 Technical</li>
            </ul>
        </div>
        <div class="settings-content">
            <h2 id="settings-title">Home</h2>
            <div id="settings-body" class="animated-content">${getSettingsContent("home")}</div>
        </div>
    </div>
    `;
        document.body.appendChild(overlay);
        // put css in
        const style = document.createElement("style");
        style.textContent = `
.home-links {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 18px;
    flex-wrap: wrap;
}
.home-link-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.3s cubic-bezier(0.19, 1, 0.22, 1);
    border: 1px solid transparent;
}
.github-greasyfork-btn {
    background: rgba(255,255,255,0.07);
    color: #e0e0e0;
    border-color: rgba(255,255,255,0.12);
}
.github-greasyfork-btn:hover {
    background: rgba(255,255,255,0.13);
    transform: translateY(-2px);
    box-shadow: 0 4px 14px rgba(0,0,0,0.3);
}
.highlight-setting {
    animation: highlightPulse 2s ease;
    background: rgba(76, 175, 80, 0.2) !important;
    border-left: 4px solid #4CAF50 !important;
    border-radius: 8px !important;
    box-shadow: 0 0 20px rgba(76, 175, 80, 0.4) !important;
}
@keyframes highlightPulse {
    0% {
        background: rgba(76, 175, 80, 0.3);
        box-shadow: 0 0 30px rgba(76, 175, 80, 0.6);
    }
    50% {
        background: rgba(76, 175, 80, 0.25);
        box-shadow: 0 0 25px rgba(76, 175, 80, 0.5);
    }
    100% {
        background: rgba(76, 175, 80, 0.15);
        box-shadow: 0 0 15px rgba(76, 175, 80, 0.3);
    }
}
.search-container {
    width: 100%;
    position: relative;
}
#settings-search {
    width: 100%;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #e0e0e0;
    font-size: 14px;
    transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
    box-sizing: border-box;
}
#settings-search:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.08);
    border-color: #4CAF50;
    box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.15);
}
#search-suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #2a2a2a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    margin-top: 4px;
    max-height: 300px;
    overflow-y: auto;
    display: none;
    z-index: 10002;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    opacity: 0;
    transform: translateY(-10px);
    transition: opacity 0.3s cubic-bezier(0.19, 1, 0.22, 1),
                transform 0.3s cubic-bezier(0.19, 1, 0.22, 1);
}
#search-suggestions.show {
    display: block;
}
@keyframes fadeInItem {
    from { opacity: 0; }
    to { opacity: 1; }
}
.search-suggestion-item {
    padding: 10px 12px;
    cursor: pointer;
    transition: all 0.6s cubic-bezier(0.19, 1, 0.22, 1);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 13px;
    opacity: 0;
    animation: fadeInItem 0.3s ease forwards;
    position: relative;
    overflow: hidden;
}
.search-suggestion-item.matched {
    background: rgba(76, 175, 80, 0.08);
    border-left: 3px solid #4CAF50;
}
.search-suggestion-item.unmatched {
    background: rgba(255, 255, 255, 0.02);
    opacity: 0.7;
}
.search-suggestion-item:last-child {
    border-bottom: none;
}
.search-suggestion-item:hover {
    background: rgba(76, 175, 80, 0.15);
    transform: translateX(2px);
    padding-left: 16px;
}
.search-suggestion-item.matched:hover {
    background: rgba(76, 175, 80, 0.2);
}
.search-suggestion-item:active {
    transform: translateX(5px) scale(0.98);
}
.suggestion-title {
    color: #4CAF50;
    font-weight: 600;
    display: block;
    margin-bottom: 2px;
    transition: color 0.3s ease;
}
.search-suggestion-item.unmatched .suggestion-title {
    color: #999;
}
.search-suggestion-item:hover .suggestion-title {
    color: #5fd663;
}
.suggestion-section {
    color: #999;
    font-size: 11px;
    transition: color 0.3s ease;
}
.search-suggestion-item:hover .suggestion-section {
    color: #b0b0b0;
}
#search-suggestions::-webkit-scrollbar {
    width: 6px;
}
#search-suggestions::-webkit-scrollbar-track {
    background: #1a1a1a;
    border-radius: 3px;
}
#search-suggestions::-webkit-scrollbar-thumb {
    background: #4CAF50;
    border-radius: 3px;
}
#search-suggestions::-webkit-scrollbar-thumb:hover {
    background: #5fd663;
}
.presets-section {
    text-align: center;
}
.presets-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-bottom: 20px;
}
.preset-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 14px;
}
.export-btn {
    background: #4CAF50;
    color: white;
}
.export-btn:hover {
    background: #45a049;
    transform: translateY(-2px);
}
.import-btn {
    background: #dc3545;
    color: white;
}
.import-btn:hover {
    background: #c82333;
    transform: translateY(-2px);
}
.presets-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 16px;
}
.preset-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: left;
}
.preset-card:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
.preset-card h4 {
    margin: 0 0 8px 0;
    color: #4CAF50;
    font-size: 14px;
}
.preset-card p {
    margin: 0;
    font-size: 12px;
    color: #c0c0c0;
    line-height: 1.4;
}
.confirmation-popup {
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10002;
    opacity: 0;
    animation-fill-mode: forwards;
}
.confirmation-content {
    background: #1a1a1a;
    border-radius: 12px;
    padding: 24px;
    width: 400px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.1);
}
.confirmation-content h3 {
    margin-top: 0;
    color: #4CAF50;
}
.confirmation-buttons {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 20px;
}
.confirm-btn, .cancel-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: transform 0.1s ease, background 0.2s ease;
}
.confirm-btn {
    background: #4CAF50;
    color: white;
}
.cancel-btn {
    background: #666;
    color: white;
}
@keyframes fadeIn {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
}
@keyframes fadeOut {
    from { opacity: 1; transform: scale(1); }
    to { opacity: 0; transform: scale(0.96); }
}
.fade-in {
    animation: fadeIn 0.25s ease-out forwards;
}
.fade-out {
    animation: fadeOut 0.2s ease-in forwards;
}
.confirm-btn:active,
.cancel-btn:active {
    transform: scale(0.96);
    filter: brightness(0.95);
}
.grayish-center {
    color: white;
    font-weight: bold;
    text-align: center;
    position: relative;
    display: inline-block;
    font-size: 18px !important;
}
.grayish-center::after {
    content: "";
    display: block;
    margin: 4px auto 0;
    width: 50%;
    border-bottom: 2px solid #888888;
    opacity: 0.6;
    border-radius: 2px;
}
li a.about-link {
    position: relative !important;
    font-weight: bold !important;
    color: #60a5fa !important;
    text-decoration: none !important;
    cursor: pointer !important;
    transition: color 0.2s ease !important;
}
li a.about-link::after {
    content: '' !important;
    position: absolute !important;
    left: 0 !important;
    bottom: -2px !important;
    height: 2px !important;
    width: 100% !important;
    background-color: #60a5fa !important;
    transform: scaleX(0) !important;
    transform-origin: left !important;
    transition: transform 0.3s ease !important;
}
li a.about-link:hover {
    color: #3b82f6 !important;
}
li a.about-link:hover::after {
    transform: scaleX(1) !important;
}
.about-section ul li a {
    position: relative;
    font-weight: bold;
    color: #60a5fa;
    text-decoration: none;
    cursor: pointer;
    transition: color 0.2s ease;
}
.about-section ul li a::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: -2px;
    height: 2px;
    width: 100%;
    background-color: #60a5fa;
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.3s ease;
}
.about-section ul li a:hover {
    color: #3b82f6;
}
.about-section ul li a:hover::after {
    transform: scaleX(1);
}
.license-note {
    font-size: 0.8em;
    color: #999;
    margin-top: 12px;
    font-style: italic;
    text-align: center;
}
.edit-button {
    margin-left: auto;
    padding: 2px 8px;
    font-size: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    background: #2a2a2a;
    color: #f0f0f0;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
}
.edit-button:hover {
    background: #323232;
    border-color: rgba(255, 255, 255, 0.15);
    color: #ffffff;
}
.help-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    background: rgba(220, 53, 69, 0.15);
    border-radius: 50%;
    font-size: 12px;
    font-weight: 600;
    color: #e02d3c;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-left: auto;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    position: relative;
    border: 1px solid rgba(220, 53, 69, 0.2);
}
.help-icon:hover {
    background: rgba(220, 53, 69, 0.25);
    transform: translateY(-1px);
    box-shadow: 0 3px 5px rgba(0, 0, 0, 0.15);
    cursor: pointer;
}
.help-icon::after {
    content: "Click for help";
    position: absolute;
    bottom: -30px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s ease;
    pointer-events: none;
}
.help-icon:hover::after {
    opacity: 1;
    visibility: visible;
}
.help-icon:active {
    transform: translateY(0);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
@keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.4); }
    70% { box-shadow: 0 0 0 6px rgba(220, 53, 69, 0); }
    100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
}
.help-icon.attention {
    animation: pulse 2s infinite;
}
.highlight-help-item {
    animation: highlight 1.5s ease;
    background: rgba(76, 175, 80, 0.1);
    border-left: 3px solid #4CAF50;
}
@keyframes highlight {
    0% { background: rgba(76, 175, 80, 0.3); }
    100% { background: rgba(76, 175, 80, 0.1); }
}
.new_label .new {
    margin-left: 8px;
    color: #32cd32;
    font-size: 12px;
    font-weight: bold;
    background-color: rgba(50, 205, 50, 0.1);
    padding: 2px 6px;
    border-radius: 3px;
    position: relative;
    z-index: 10001;
}
.new_label .tooltip {
    visibility: hidden;
    background-color: rgba(0, 0, 0, 0.75);
    color: #fff;
    font-size: 12px;
    padding: 6px;
    border-radius: 5px;
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    z-index: 10001;
    opacity: 0;
    transition: opacity 0.3s;
}
.new_label .new:hover .tooltip {
    visibility: visible;
    opacity: 1;
    z-index: 10001;
}
.experiment_label .experimental {
    margin-left: 8px;
    color: gold;
    font-size: 12px;
    font-weight: bold;
    background-color: rgba(255, 215, 0, 0.1);
    padding: 2px 6px;
    border-radius: 3px;
    position: relative;
    z-index: 10001;
}
.experiment_label .tooltip {
    visibility: hidden;
    background-color: rgba(0, 0, 0, 0.7);
    color: #fff;
    font-size: 12px;
    padding: 6px;
    border-radius: 5px;
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    z-index: 10001;
    opacity: 0;
    transition: opacity 0.3s;
}
.experiment_label .experimental:hover .tooltip {
    visibility: visible;
    opacity: 1;
    z-index: 10001;
}
@keyframes sectionFade {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
}
@keyframes slideIn {
    from { transform: translateX(-20px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
#userscript-settings-menu {
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.7s cubic-bezier(0.19, 1, 0.22, 1);
}
.settings-container {
    display: flex;
    position: relative;
    width: 580px;
    height: 480px;
    background: linear-gradient(145deg, #1a1a1a, #232323);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7);
    font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    border: 1px solid rgba(255, 255, 255, 0.05);
}
#close-settings {
    position: absolute;
    top: 12px;
    right: 12px;
    background: transparent;
    border: none;
    color: #c0c0c0;
    font-size: 20px;
    cursor: pointer;
    z-index: 10001;
    transition: all 0.5s ease;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}
#close-settings:hover {
    color: #ff3b47;
    background: rgba(255, 59, 71, 0.1);
    transform: rotate(90deg);
}
.settings-sidebar {
    width: 32%;
    background: #272727;
    padding: 18px 12px;
    color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 6px 0 12px -6px rgba(0,0,0,0.3);
    position: relative;
    overflow-y: auto;
}
.settings-sidebar h2 {
    margin-bottom: 16px;
    font-weight: 600;
    font-size: 22px;
    text-shadow: 0 1px 3px rgba(0,0,0,0.5);
    text-decoration: none;
    position: relative;
    text-align: center;
}
.settings-sidebar h2::after {
    content: "";
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: -6px;
    width: 36px;
    height: 3px;
    background: white;
    border-radius: 2px;
}
.settings-sidebar ul {
    list-style: none;
    padding: 0;
    width: 100%;
    margin-top: 5px;
}
.settings-sidebar li {
    padding: 10px 12px;
    margin: 6px 0;
    text-align: left;
    cursor: pointer;
    transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
    border-radius: 8px;
    font-weight: 500;
    font-size: 17px;
    position: relative;
    animation: slideIn 0.5s cubic-bezier(0.19, 1, 0.22, 1);
    animation-fill-mode: both;
    display: flex;
    align-items: center;
}
.settings-sidebar li:hover {
    background: #444;
    transform: translateX(5px);
}
.settings-sidebar .active {
    background: #444;
    color: white;
    transform: translateX(0);
}
.settings-sidebar .active:hover {
    transform: translateX(0);
}
.settings-sidebar .active::before {
    background: #dc3545;
}
.settings-sidebar::-webkit-scrollbar {
    width: 6px;
}
.settings-sidebar::-webkit-scrollbar-track {
    background: black;
    border-radius: 3px;
}
.settings-sidebar::-webkit-scrollbar-thumb {
    background: darkgreen;
    border-radius: 3px;
}
.settings-sidebar::-webkit-scrollbar-thumb:hover {
    background: #006400;
}
.settings-sidebar {
    scrollbar-width: thin;
    scrollbar-color: darkgreen black;
}
.settings-content {
    flex: 1;
    padding: 24px;
    color: white;
    text-align: center;
    max-height: 100%;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: darkgreen black;
    background: #1e1e1e;
    position: relative;
}
.settings-content::-webkit-scrollbar {
    width: 6px;
}
.settings-content::-webkit-scrollbar-track {
    background: #333;
    border-radius: 3px;
}
.settings-content::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #dc3545, #b02a37);
    border-radius: 3px;
}
.settings-content::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, #ff3b47, #dc3545);
}
.settings-content h2 {
    margin-bottom: 24px;
    font-weight: 600;
    font-size: 22px;
    color: white;
    text-shadow: 0 1px 3px rgba(0,0,0,0.4);
    letter-spacing: 0.5px;
    position: relative;
    display: inline-block;
    padding-bottom: 6px;
}
.settings-content h2::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: white;
    border-radius: 2px;
}
.settings-content div {
    animation: sectionFade 0.7s cubic-bezier(0.19, 1, 0.22, 1);
}
.toggle-slider {
    display: flex;
    align-items: center;
    margin: 12px 0;
    cursor: pointer;
    padding: 8px 14px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    transition: all 0.5s ease;
    user-select: none;
    border: 1px solid rgba(255, 255, 255, 0.05);
}
.toggle-slider:hover {
    background: rgba(255, 255, 255, 0.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
}
.toggle-slider input {
    display: none;
}
.toggle-slider .slider {
    position: relative;
    display: inline-block;
    width: 42px;
    height: 22px;
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 22px;
    margin-right: 12px;
    transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
}
.toggle-slider .slider::before {
    content: "";
    position: absolute;
    height: 16px;
    width: 16px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    border-radius: 50%;
    transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
.toggle-slider input:checked + .slider {
    background-color: #4CAF50;
    box-shadow: 0 0 0 1px rgba(220, 53, 69, 0.05), inset 0 1px 3px rgba(0, 0, 0, 0.2);
}
.toggle-slider input:checked + .slider::before {
    transform: translateX(20px);
}
.rolocate-logo {
    width: 90px !important;
    height: 90px !important;
    object-fit: contain;
    border-radius: 14px;
    display: block;
    margin: 0 auto 16px auto;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
    transition: all 0.5s ease;
    border: 2px solid rgba(220, 53, 69, 0.4);
}
.rolocate-logo:hover {
    transform: scale(1.05);
}
.settings-content ul {
    text-align: left;
    list-style-type: none;
    padding: 0;
    margin-top: 16px;
}
.settings-content ul li {
    margin: 12px 0;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    transition: all 0.4s ease;
}
.settings-content ul li:hover {
    background: rgba(255, 255, 255, 0.05);
    border-left: 3px solid #4CAF50;
    transform: translateX(5px);
}
.settings-content ul li strong {
    color: #4CAF50;
}
.warning_advanced {
    font-size: 14px;
    color: #ff3b47;
    font-weight: bold;
    padding: 8px 14px;
    background: rgba(220, 53, 69, 0.1);
    border-radius: 6px;
    margin-bottom: 16px;
    display: inline-block;
    border: 1px solid rgba(220, 53, 69, 0.2);
    box-shadow: 0 0 6px rgba(220, 53, 69, 0.3);
    transition: box-shadow 0.3s ease;
}
.warning_advanced:hover {
    box-shadow: 0 0 12px rgba(220, 53, 69, 0.6);
}
.general_section {
    font-size: 14px;
    color: #858585;
    font-weight: bold;
    padding: 8px 14px;
    background: rgba(140, 140, 140, 0.12);
    border-radius: 6px;
    margin-bottom: 16px;
    display: inline-block;
    border: 1px solid rgba(120, 120, 120, 0.2);
    box-shadow: 0 0 6px rgba(120, 120, 120, 0.2);
    transition: box-shadow 0.3s ease;
}
.general_section:hover {
    box-shadow: 0 0 10px rgba(120, 120, 120, 0.35);
}
.appearance_section {
    font-size: 14px;
    color: #6b5cff;
    font-weight: bold;
    padding: 8px 14px;
    background: rgba(107, 92, 255, 0.1);
    border-radius: 6px;
    margin-bottom: 16px;
    display: inline-block;
    border: 1px solid rgba(107, 92, 255, 0.25);
    box-shadow: 0 0 6px rgba(107, 92, 255, 0.25);
    transition: box-shadow 0.3s ease;
}
.appearance_section:hover {
    box-shadow: 0 0 12px rgba(107, 92, 255, 0.5);
}
.extras_section {
    font-size: 14px;
    color: #0d6efd;
    font-weight: bold;
    padding: 8px 14px;
    background: rgba(13, 110, 253, 0.1);
    border-radius: 6px;
    margin-bottom: 16px;
    display: inline-block;
    border: 1px solid rgba(13, 110, 253, 0.3);
    box-shadow: 0 0 6px rgba(13, 110, 253, 0.3);
    transition: box-shadow 0.3s ease;
}
.extras_section:hover {
    box-shadow: 0 0 12px rgba(13, 110, 253, 0.6);
}
.edit-nav-button {
    padding: 6px 14px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-family: 'Inter', 'Helvetica', sans-serif;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
    height: auto;
    line-height: 1.5;
    position: relative;
    overflow: hidden;
}
.edit-nav-button:hover {
    transform: translateY(-3px);
    background: linear-gradient(135deg, #1e8449 0%, #196f3d 100%);
}
.edit-nav-button:active {
    background: linear-gradient(135deg, #1e8449 0%, #196f3d 100%);
    transform: translateY(1px);
}
#prioritylocation-select {
    width: 100%;
    padding: 10px 14px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    color: #e0e0e0;
    font-size: 14px;
    appearance: none;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23dc3545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>');
    background-repeat: no-repeat;
    background-position: right 14px center;
    background-size: 14px;
    transition: all 0.5s ease;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    border-color: rgba(255, 255, 255, 0.05);
}
#location-hint {
    margin-top: 10px;
    font-size: 12px;
    color: #c0c0c0;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    padding: 10px 14px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    line-height: 1.6;
    transition: all 0.5s ease;
}
.section-separator {
    width: 100%;
    height: 1px;
    background: linear-gradient(90deg, transparent, #272727, transparent);
    margin: 24px 0;
}
.help-section h3, .about-section h3 {
    color: white;
    margin-top: 20px;
    margin-bottom: 12px;
    font-size: 16px;
    text-align: left;
}
.hint-text {
    font-size: 13px;
    color: #a0a0a0;
    margin-top: 6px;
    margin-left: 16px;
    text-align: left;
}
.location-settings {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    padding: 14px;
    margin-top: 16px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.5s ease;
}
.setting-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}
.setting-header span {
    font-size: 14px;
    font-weight: 500;
}
#manual-coordinates {
    margin-top: 12px !important;
}
.coordinates-inputs {
    gap: 8px !important;
    margin-bottom: 10px !important;
}
#manual-coordinates input {
    padding: 8px 10px !important;
    border-radius: 6px !important;
    font-size: 13px !important;
}
#manual-coordinates label {
    margin-bottom: 6px !important;
    font-size: 13px !important;
}
#save-coordinates {
    margin-top: 6px !important;
}
.animated-content {
    animation: sectionFade 0.7s cubic-bezier(0.19, 1, 0.22, 1);
}
.section-divider {
    height: 1px !important;
    background: linear-gradient(90deg, transparent, #444, transparent);
    margin: 8px 12px !important;
    padding: 0 !important;
    cursor: default !important;
    pointer-events: none;
}
.section-divider:hover {
    background: linear-gradient(90deg, transparent, #444, transparent) !important;
    transform: none !important;
}
    `;
        document.head.appendChild(style);
        // hopefully this works
        document.querySelectorAll(".settings-sidebar li").forEach((li, index) => {
            // aniamtions stuff
            li.style.animationDelay = `${0.05 * (index + 1)}s`;
            li.addEventListener("click", function() {
                const currentActive = document.querySelector(".settings-sidebar .active");
                if (currentActive) currentActive.classList.remove("active");
                this.classList.add("active");
                const section = this.getAttribute("data-section");
                const settingsBody = document.getElementById("settings-body");
                const settingsTitle = document.getElementById("settings-title");
                // aniamtions stuff
                settingsBody.style.opacity = "0";
                settingsBody.style.transform = "translateY(10px)";
                settingsTitle.style.opacity = "0";
                settingsTitle.style.transform = "translateY(10px)";
                setTimeout(() => {
                    // aniamtions stuff
                    settingsTitle.textContent = section.charAt(0).toUpperCase() + section.slice(1);
                    settingsBody.innerHTML = getSettingsContent(section);

                    // helper to show edit buttons. a lot easier now
                    function bindToggle({ sectionKey, checkboxId, buttonId, storageKey, saveOnChange = true }) {
                        const checkbox = document.getElementById(checkboxId);
                        const button = document.getElementById(buttonId);

                        if (!checkbox || !button) return;

                        // initial state
                        const saved = localStorage.getItem(storageKey) === "true";
                        button.style.display = saved ? "block" : "none";
                        checkbox.checked = saved;

                        // listener
                        checkbox.addEventListener("change", function () {
                            const isEnabled = this.checked;

                            if (saveOnChange) {
                                localStorage.setItem(storageKey, isEnabled);
                            }

                            button.style.display = isEnabled ? "block" : "none";
                        });
                    }

                    if (section === "general") {
                        bindToggle({
                            checkboxId: "AutoRunServerRegions",
                            buttonId: "edit-autoserverregionsbutton-btn",
                            storageKey: "ROLOCATE_AutoRunServerRegions"
                        });

                        bindToggle({
                            checkboxId: "bettergamestats",
                            buttonId: "edit-bettergamestats-btn",
                            storageKey: "ROLOCATE_bettergamestats"
                        });
                    }

                    if (section === "appearance") {
                        bindToggle({
                            checkboxId: "removeads",
                            buttonId: "edit-removeads-btn",
                            storageKey: "ROLOCATE_removeads"
                        });

                        bindToggle({
                            checkboxId: "betterprivateservers",
                            buttonId: "edit-betterprivateservers-btn",
                            storageKey: "ROLOCATE_betterprivateservers"
                        });

                        bindToggle({
                            checkboxId: "custombackgrounds",
                            buttonId: "edit-backgrounds-btn",
                            storageKey: "ROLOCATE_custombackgrounds"
                        });
                    }

                    if (section === "advanced") {
                        bindToggle({
                            checkboxId: "togglefilterserversbutton",
                            buttonId: "edit-serverfilters-btn",
                            storageKey: "ROLOCATE_togglefilterserversbutton"
                        });
                    }

                    if (section === "extras") {
                        bindToggle({
                            checkboxId: "gamequalityfilter",
                            buttonId: "edit-gamequality-btn",
                            storageKey: "ROLOCATE_gamequalityfilter"
                        });
                    }

                    settingsBody.style.transition = "all 0.4s cubic-bezier(0.19, 1, 0.22, 1)";
                    settingsTitle.style.transition = "all 0.4s cubic-bezier(0.19, 1, 0.22, 1)";
                    void settingsBody.offsetWidth;
                    void settingsTitle.offsetWidth;
                    settingsBody.style.opacity = "1";
                    settingsBody.style.transform = "translateY(0)";
                    settingsTitle.style.opacity = "1";
                    settingsTitle.style.transform = "translateY(0)";
                    applyStoredSettings();
                }, 200);
            });
        });
        // close button
        document.getElementById("close-settings").addEventListener("click", function() {
            const priorityLocation = localStorage.getItem("ROLOCATE_prioritylocation");
            if (priorityLocation === "manual") {
                try {
                    const coords = JSON.parse(GM_getValue("ROLOCATE_coordinates", '{"lat":"","lng":""}'));
                    if (!coords.lat || !coords.lng) {
                        notifications('Please set the latitude and longitude values for the manual location, or set it to automatic.', 'error', '⚠️', 8000);
                        return; // prevent closing if no coordiantes in manual mode
                    }
                } catch (error) {
                    ConsoleLogEnabled("Error checking coordinates:", error);
                    notifications('Error checking location settings', 'error', '⚠️', 8000);
                    return; // prevent closing if there is an error
                }
            }
            // uh close if all is good
            const menu = document.getElementById("userscript-settings-menu");
            menu.style.animation = "fadeOut 0.4s cubic-bezier(0.19, 1, 0.22, 1) forwards";
            // cool aniamtion for the close button
            this.style.transform = "rotate(90deg)";
            setTimeout(() => menu.remove(), 400);
        });
        // uh does whats in the fucntion name
        applyStoredSettings();
        // oooo a ripple animation cool :)
        const buttons = document.querySelectorAll(".edit-nav-button, .settings-button");
        buttons.forEach(button => {
            button.addEventListener("mousedown", function(e) {
                const ripple = document.createElement("span");
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                ripple.style.cssText = `
                position: absolute;
                background: rgba(255,255,255,0.4);
                border-radius: 50%;
                pointer-events: none;
                width: ${size}px;
                height: ${size}px;
                top: ${y}px;
                left: ${x}px;
                transform: scale(0);
                transition: transform 0.6s, opacity 0.6s;
            `;
                this.appendChild(ripple);
                setTimeout(() => {
                    ripple.style.transform = "scale(2)";
                    ripple.style.opacity = "0";
                    setTimeout(() => ripple.remove(), 600);
                }, 10);
            });
        });
        // uh look at help icon clicky
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('help-icon')) {
                // no glitches no bubble up
                e.stopPropagation();
                e.preventDefault();
                const helpItem = e.target.getAttribute('data-help');
                if (helpItem) {
                    // go to help tab
                    const helpTab = document.querySelector('.settings-sidebar li[data-section="help"]');
                    if (helpTab) helpTab.click();
                    // cool animtion to scroll down on help tab
                    setTimeout(() => {
                        const helpElement = document.getElementById(`help-${helpItem}`);
                        if (helpElement) {
                            helpElement.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center'
                            });
                            helpElement.classList.add('highlight-help-item');
                            setTimeout(() => {
                                helpElement.classList.remove('highlight-help-item');
                            }, 1500);
                        }
                    }, 300);
                }
            }
        });
        // all settings that are shown in search in settings
        // js for the search funcitonality & suggestions based on wording
        const searchableSettings = [
            ["SmartSearch", "general", "smartsearch", "search smart instant fast quick banned user"],
            ["Auto Server Regions", "general", "AutoRunServerRegions", "auto server regions automatic"],
            ["Fast Server Search", "general", "fastservers", "fast server speed quick 100x"],
            ["Invert Player Count", "general", "invertplayercount", "invert player count"],
            ["Recent Servers", "general", "togglerecentserverbutton", "recent server history"],
            ["Join Confirmation", "general", "joinconfirmation", "join confirm popup ingame"],
            ["Better Game Stats", "general", "bettergamestats", "better game stats statistics revenue money gamepass"],
            ["Disable Trailer Autoplay", "appearance", "disabletrailer", "trailer autoplay video"],
            ["Smart Join Popup", "appearance", "smartjoinpopup", "join popup smart region"],
            ["Remove All Roblox Ads", "appearance", "removeads", "ads remove block ad blocker recommend recommended standout sitin for you recomend"],
            ["Restore Classic Terms", "appearance", "restoreclassicterms", "classic terms restore friends groups catalog connections communities marketplace"],
            ["Responsive Game Cards", "appearance", "responsivegamecards", "game cards responsive"],
            ["Better Private Servers", "appearance", "betterprivateservers", "small private server compact"],
            ["Custom Backgrounds", "appearance", "custombackgrounds", "custom background custom theme"],
            ["Enable Console Logs", "advanced", "enableLogs", "console log debug"],
            ["Enable Server Filters", "advanced", "togglefilterserversbutton", "server filter server regions best connection small server"],
            ["Enable Server Hop Button", "advanced", "toggleserverhopbutton", "server hop button random server"],
            ["Enable Notifications", "advanced", "enablenotifications", "notification alert"],
            ["Fix BTRoblox Compatability", "advanced", "btrobloxfix", "btroblox fix compatible"],
            ["Mobile Mode", "advanced", "mobilemode", "mobile mode phone android ios"],
            ["Force Dark Mode Styles", "advanced", "forcedarkmode", "dark mode force theme fix"],
            ["Set Default Location Mode", "advanced", "prioritylocation-select", "location gps coordinates manual automatic"],
            ["Game Quality Filter", "extras", "gamequalityfilter", "game quality filter bad games"],
            ["Better Profile Info", "extras", "loadbetterprofileinfo", "mutual friends shared account age"],
            ["Disable Chat", "extras", "disablechat", "chat disable hide"],
            ["Quick Launch Games", "extras", "quicklaunchgames", "quick launch favorite pinned games"],
            ["Show Old Greeting", "extras", "ShowOldGreeting", "old greeting classic"],
            ["Better Friends", "extras", "betterfriends", "best friends better"]
        ].map(([name, section, id, keywords]) => ({
            name, section, id, keywords: keywords.split(' ')
        }));

        const searchInput = document.getElementById('settings-search');
        const suggestionsBox = document.getElementById('search-suggestions');

        if (searchInput && suggestionsBox) {
            let debounceTimer;

            // holy crap this was annoying af
            searchInput.addEventListener('input', function() {
                clearTimeout(debounceTimer);
                const q = this.value.toLowerCase().trim();

                debounceTimer = setTimeout(() => {
                    const results = searchableSettings.map(s => ({
                        ...s,
                        match: !q || s.name.toLowerCase().includes(q) ||
                               s.section.toLowerCase().includes(q) ||
                               s.keywords.some(k => k.includes(q))
                    })).sort((a, b) => b.match - a.match);

                    suggestionsBox.innerHTML = results.map((r, i) => `
                        <div class="search-suggestion-item ${r.match && q ? 'matched' : 'unmatched'}"
                             data-section="${r.section}" data-setting="${r.name}"
                             style="animation-delay: ${i * 0.05}s">
                            <span class="suggestion-title">${r.name}</span>
                            <span class="suggestion-section">${r.section[0].toUpperCase() + r.section.slice(1)}</span>
                        </div>
                    `).join('');

                    suggestionsBox.classList.add('show');
                    // Add a small delay to let display: block render first
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            suggestionsBox.style.opacity = '1';
                            suggestionsBox.style.transform = 'translateY(0)';
                        });
                    });
                }, 100);
            });

            // also show all suggestions when search box is focused & nothing is shown
            searchInput.addEventListener('focus', function() {
                 // show suggestions if there is text too
                 this.dispatchEvent(new Event('input'));
            });

            // hide suggestions when clicking outside
            document.addEventListener('click', function(e) {
                if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
                    suggestionsBox.style.opacity = '0';
                    suggestionsBox.style.transform = 'translateY(-10px)';
                    setTimeout(() => {
                        suggestionsBox.classList.remove('show');
                    }, 200);
                }
            });

            // hde suggestions when search box loses focus unless is clisnign the suggestions
            searchInput.addEventListener('blur', function() {
                setTimeout(() => {
                    if (!suggestionsBox.matches(':hover')) {
                        suggestionsBox.style.opacity = '0';
                        suggestionsBox.style.transform = 'translateY(-10px)';
                        setTimeout(() => {
                            suggestionsBox.classList.remove('show');
                        }, 200);
                    }
                }, 150);
            });

            // click on suggestion
            suggestionsBox.addEventListener('click', function(e) {
                const item = e.target.closest('.search-suggestion-item');
                if (item) {
                    const section = item.getAttribute('data-section');
                    const settingName = item.getAttribute('data-setting');

                    // add click animation
                    item.style.transform = 'scale(0.95)';
                    setTimeout(() => item.style.transform = '', 100);

                    // go to section
                    const sectionTab = document.querySelector(`.settings-sidebar li[data-section="${section}"]`);
                    if (sectionTab) {
                        sectionTab.click();

                        // highlight and scroll to the actual setting toggle
                        setTimeout(() => {
                            // try to find the setting by its ID or text content
                            const settingElement = findSettingElement(settingName, section);

                            if (settingElement) {
                                settingElement.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'center'
                                });

                                // add highlight class
                                settingElement.classList.add('highlight-setting');

                                // remove highlight after 2 seconds
                                setTimeout(() => {
                                    settingElement.classList.remove('highlight-setting');
                                }, 2000);
                            }
                        }, 400); // wait for section transition
                    }

                    searchInput.value = '';
                    suggestionsBox.style.opacity = '0';
                    suggestionsBox.style.transform = 'translateY(-10px)';
                    setTimeout(() => {
                        suggestionsBox.classList.remove('show');
                        suggestionsBox.style.transform = 'translateY(0)';
                    }, 200);
                }
            });
            // helper function to find the setting element and stufdf
            function findSettingElement(settingName) {
                const setting = searchableSettings.find(s => s.name === settingName);
                if (!setting?.id) return null;
                const el = document.getElementById(setting.id);
                return el?.closest('.toggle-slider') || el?.closest('.location-settings');
            }
        }
    }


    /*******************************************************
    name of function: applyStoredSettings
    description: makes sure local storage is stored in correctly
    *******************************************************/
    function applyStoredSettings() {
        // checkbox stuff
        document.querySelectorAll("input[type='checkbox']").forEach(checkbox => {
            const storageKey = `ROLOCATE_${checkbox.id}`;
            const savedValue = localStorage.getItem(storageKey);
            checkbox.checked = savedValue === "true";

            checkbox.addEventListener("change", () => {
                localStorage.setItem(storageKey, checkbox.checked);
            });
        });

        // location stuff
        const prioritySelect = document.getElementById("prioritylocation-select");
        if (prioritySelect) {
            const storageKey = "ROLOCATE_prioritylocation";
            const savedValue = localStorage.getItem(storageKey) || "automatic";
            prioritySelect.value = savedValue;

            // hide coordinate box if in automica vice versa
            const manualCoordinates = document.getElementById("manual-coordinates");
            if (manualCoordinates) {
                manualCoordinates.style.display = savedValue === "manual" ? "block" : "none";

                // manual set input stuff
                if (savedValue === "manual") {
                    try {
                        const savedCoords = JSON.parse(GM_getValue("ROLOCATE_coordinates", '{"lat":"","lng":""}'));
                        document.getElementById("latitude").value = savedCoords.lat || "";
                        document.getElementById("longitude").value = savedCoords.lng || "";

                        // if manual mode but no coordinates saved go back to automatic
                        if (!savedCoords.lat || !savedCoords.lng) {
                            prioritySelect.value = "automatic";
                            localStorage.setItem(storageKey, "automatic");
                            manualCoordinates.style.display = "none";
                        }
                    } catch (error) {
                        ConsoleLogEnabled("Error loading saved coordinates:", error);
                    }
                }
            }

            prioritySelect.addEventListener("change", () => {
                const newValue = prioritySelect.value;
                localStorage.setItem(storageKey, newValue);

                // show coordinate input if thereq
                if (manualCoordinates) {
                    manualCoordinates.style.display = newValue === "manual" ? "block" : "none";

                    // when switching to manual mode load any saved coordinates
                    if (newValue === "manual") {
                        try {
                            const savedCoords = JSON.parse(GM_getValue("ROLOCATE_coordinates", '{"lat":"","lng":""}'));
                            document.getElementById("latitude").value = savedCoords.lat || "";
                            document.getElementById("longitude").value = savedCoords.lng || "";

                            // if no input then keep it empty
                        } catch (error) {
                            ConsoleLogEnabled("Error loading saved coordinates:", error);
                        }
                    }
                }
            });
        }

        // uh buttons that need special treatment

        const editRemoveads = document.getElementById("edit-removeads-btn");
        if (editRemoveads) {
            editRemoveads.addEventListener("click", () => {
                editremoveads();
            });
        }

        const editBackgrounds = document.getElementById("edit-backgrounds-btn");
        if (editBackgrounds) {
            editBackgrounds.addEventListener("click", () => {
                showSettingsPopup_background();
            });
        }

        const editQualityGameBtn = document.getElementById("edit-gamequality-btn");
        if (editQualityGameBtn) {
            editQualityGameBtn.addEventListener("click", () => {
                openGameQualitySettings();
            });
        }

        const fastServersToggle = document.getElementById("fastservers");
        if (fastServersToggle) {
            fastServersToggle.addEventListener("change", () => {
                if (fastServersToggle.checked) {
                    notifications('Fast Server Search: 100x faster on Violentmonkey, ~2x on Tampermonkey.', 'info', '🧪', 2000);
                }
            });
        }

        const AutoRunServerRegions = document.getElementById("AutoRunServerRegions");
        const AutoRunServerRegionsbutton = document.getElementById("edit-autoserverregionsbutton-btn")
        if (AutoRunServerRegions) {
            AutoRunServerRegions.addEventListener("change", () => {
                if (AutoRunServerRegions.checked) {
                    notifications('Auto Server Regions works best when paired with Fast Server Search in Advanced Settings.', 'info', '🧪', 2000);
                }
            });
            AutoRunServerRegionsbutton.addEventListener("click", () => {
                ChangeAutoServerRegionCount();
            });
        }

        const editServerfilters = document.getElementById("edit-serverfilters-btn");
        if (editServerfilters) {
            editServerfilters.addEventListener("click", () => {
                editserverregions();
            });
        }

        const editBetterPrivateServers = document.getElementById("edit-betterprivateservers-btn");
        if (editBetterPrivateServers) {
            editBetterPrivateServers.addEventListener("click", () => {
                editprivateserversettings();
            });
        }

        const editbettergamestats = document.getElementById("edit-bettergamestats-btn");
        if (editbettergamestats) {
            editbettergamestats.addEventListener("click", () => {
                bettergamestats_settings();
            });
        }

        // save coordinates button duh
        const saveCoordinatesBtn = document.getElementById("save-coordinates");
        if (saveCoordinatesBtn) {
            saveCoordinatesBtn.addEventListener("click", () => {
                const latInput = document.getElementById("latitude");
                const lngInput = document.getElementById("longitude");
                const lat = latInput.value.trim();
                const lng = lngInput.value.trim();

                // doubole check for stuff
                if (!lat || !lng) {
                    const prioritySelect = document.getElementById("prioritylocation-select");
                    if (prioritySelect) {
                        prioritySelect.value = "automatic";
                        localStorage.setItem("ROLOCATE_prioritylocation", "automatic");
                        document.getElementById("manual-coordinates").style.display = "none";

                        // if user sees this then something went wrong.
                        saveCoordinatesBtn.textContent = "Reverted to Automatic!";
                        saveCoordinatesBtn.style.background = "#4CAF50";

                        setTimeout(() => {
                            saveCoordinatesBtn.textContent = "Save Coordinates";
                            saveCoordinatesBtn.style.background = "background: #4CAF50;";
                        }, 2000);
                    }
                    return;
                }

                // make sure they are actually real coordiantes
                // wont check if ur in a middle of the ocean lmao
                const latNum = parseFloat(lat);
                const lngNum = parseFloat(lng);
                if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
                    notifications('Invalid coordinates! Latitude must be between -90 and 90, and longitude between -180 and 180.', 'error', '⚠️', '8000');
                    return;
                }

                // save the coordinates
                const coordinates = {
                    lat,
                    lng
                };
                GM_setValue("ROLOCATE_coordinates", JSON.stringify(coordinates)); // store coordinates in secure storage

                // make sure in manaul mode. triple check
                localStorage.setItem("ROLOCATE_prioritylocation", "manual");
                if (prioritySelect) {
                    prioritySelect.value = "manual";
                }

                // tell user it saved
                saveCoordinatesBtn.textContent = "Saved!";
                saveCoordinatesBtn.style.background = "linear-gradient(135deg, #1e8449 0%, #196f3d 100%);";

                setTimeout(() => {
                    saveCoordinatesBtn.textContent = "Save Coordinates";
                    saveCoordinatesBtn.style.background = "background: #4CAF50;";
                }, 2000);
            });
        }

        const exportBtn = document.getElementById("export-settings");
        const importBtn = document.getElementById("import-settings");
        const importFile = document.getElementById("import-file");

        if (exportBtn) {
            exportBtn.addEventListener("click", exportSettings);
        }

        if (importBtn && importFile) {
            importBtn.addEventListener("click", () => importFile.click());
            importFile.addEventListener("change", (e) => {
                if (e.target.files[0]) {
                    showConfirmation(
                        "Import Settings",
                        "This will overwrite your current settings. Continue?",
                        () => importSettings(e.target.files[0])
                    );
                }
            });
        }

        // preset cards
        document.querySelectorAll(".preset-card").forEach(card => {
            card.addEventListener("click", () => {
                const preset = card.dataset.preset;
                const config = presetConfigurations[preset];
                if (config) {
                    showConfirmation(
                        `Apply ${config.name} Preset`,
                        `This will change your current settings to the ${config.name} configuration. Continue?`,
                        () => applyPreset(preset)
                    );
                }
            });
        });
    }



    function exportSettings() {
        const settings = {};
        Object.keys(defaultSettings).forEach(key => {
            settings[key] = localStorage.getItem(`ROLOCATE_${key}`);
        });

        const blob = new Blob([JSON.stringify(settings, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rolocate-settings.json';
        a.click();
        URL.revokeObjectURL(url);

        notifications('Settings exported successfully!', 'success', '📤', 3000);
    }

    function importSettings(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const settings = JSON.parse(e.target.result);
                Object.entries(settings).forEach(([key, value]) => {
                    if (Object.prototype.hasOwnProperty.call(defaultSettings, key) && value !== null) {
                        localStorage.setItem(`ROLOCATE_${key}`, value);
                    }
                });
                notifications('Settings imported successfully! Refresh the page to see changes.', 'success', '📥', 5000);
            } catch (error) {
                notifications('Invalid settings file!', 'error', '❌', 3000);
            }
        };
        reader.readAsText(file);
    }

    function applyPreset(presetKey) {
        const preset = presetConfigurations[presetKey];
        if (!preset) return;
        const merged = { ...defaultSettings, ...preset.settings };
        Object.entries(merged).forEach(([key, value]) => {
            localStorage.setItem(`ROLOCATE_${key}`, value);
        });
        notifications(`${preset.name} preset applied! Refreshing the page in 3 seconds...`, 'success', '⚡', 3000);
        setTimeout(() => { location.reload(); }, 3000);
    }

    function showConfirmation(title, message, onConfirm) {
        const popup = document.createElement('div');
        popup.className = 'confirmation-popup fade-in';
        popup.innerHTML = `
            <div class="confirmation-content">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="confirmation-buttons">
                    <button class="confirm-btn">Confirm</button>
                    <button class="cancel-btn">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(popup);

        const removePopup = () => {
            popup.classList.remove('fade-in');
            popup.classList.add('fade-out');
            popup.addEventListener('animationend', () => popup.remove(), {
                once: true
            });
        };

        popup.querySelector('.confirm-btn').addEventListener('click', () => {
            removePopup();
            onConfirm();
        });

        popup.querySelector('.cancel-btn').addEventListener('click', () => {
            removePopup();
        });
    }


    /*******************************************************
    name of function: AddSettingsButton
    description: adds settings button
    *******************************************************/
    function AddSettingsButton() {
        const base64Logo = window.Base64Images.logo;
        const navbarGroup = document.querySelector('.nav.navbar-right.rbx-navbar-icon-group');
        if (!navbarGroup || document.getElementById('custom-logo')) return;

        const li = document.createElement('li');
        li.id = 'custom-logo-container';
        li.style.position = 'relative';

        li.innerHTML = `
        <img id="custom-logo"
             style="
                 margin-top: 6px;
                 margin-left: 6px;
                 width: 26px;
                 cursor: pointer;
                 border-radius: 4px;
                 transition: all 0.2s ease-in-out;
             "
             src="${base64Logo}">
        <span id="custom-tooltip"
              style="
                  visibility: hidden;
                  background-color: black;
                  color: white;
                  text-align: center;
                  padding: 5px;
                  border-radius: 5px;
                  position: absolute;
                  top: 35px;
                  left: 50%;
                  transform: translateX(-50%);
                  white-space: nowrap;
                  font-size: 12px;
                  opacity: 0;
                  transition: opacity 0.2s ease-in-out;
              ">
              Settings
        </span>
    `;

        const logo = li.querySelector('#custom-logo');
        const tooltip = li.querySelector('#custom-tooltip');

        logo.addEventListener('click', () => openSettingsMenu());

        logo.addEventListener('mouseover', () => {
            logo.style.width = '30px';
            logo.style.border = '2px solid white';
            tooltip.style.visibility = 'visible';
            tooltip.style.opacity = '1';
        });

        logo.addEventListener('mouseout', () => {
            logo.style.width = '26px';
            logo.style.border = 'none';
            tooltip.style.visibility = 'hidden';
            tooltip.style.opacity = '0';
        });

        navbarGroup.appendChild(li);
    }

    /*******************************************************
    name of function: editremoveads
    description: popup for customizing the ads
    *******************************************************/
    function editremoveads () {
      // don't open it twice
      if (document.getElementById('rolocate-ad-settings-modal')) return;

      // default toggle values
      const defaultSettings = {
        adIframes: true,
        sponsoredGames: true,
        sponsoredSections: true,
        todaysPicks: true,
        recommendedForYou: true,
        feedItems: true,
        standoutGames: true,
        sitdownGames: true
      };

      // load saved settings and fall back to defaults
      const savedSettings = JSON.parse(
        localStorage.getItem('ROLOCATE_editremoveads') || '{}'
      );
      const settings = { ...defaultSettings, ...savedSettings };

      // dark background overlay
      const overlay = document.createElement('div');
      overlay.id = 'rolocate-ad-settings-modal';
      overlay.style.cssText = `
        position:fixed;inset:0;display:flex;justify-content:center;align-items:center;
        background:rgba(0,0,0,.45);z-index:10000;opacity:0;transition:.2s;
      `;

      // main modal box
      const modal = document.createElement('div');
      modal.style.cssText = `
        background:#181818;border-radius:14px;padding:18px;width:340px;max-width:92vw;
        color:#fff;border:1px solid #2f2f2f;box-shadow:0 10px 30px rgba(0,0,0,.6);
        transform:scale(.96) translateY(12px);transition:.2s;
      `;

      // title + subtitle
      modal.innerHTML = `
        <h2 style="margin:0;font-size:18px;text-align:center">Ad Settings</h2>
        <p style="margin:6px 0 0px;text-align:center;font-size:12px;color:#aaa">
          Choose what you want hidden
        </p>
      `;

      // toggle definitions
      const toggleOptions = [
        ['adIframes', 'Ad Iframes'],
        ['sponsoredGames', 'Sponsored Games'],
        ['sponsoredSections', 'Sponsored Sections (Home Page)'],
        ['todaysPicks', "Today's Picks (Home Page)"],
        ['recommendedForYou', 'Recommended For You (Home Page)'],
        ['feedItems', 'Feed Posts (Home Page)'],
        ['standoutGames', 'Standout Games (Home Page)'],
        ['sitdownGames', 'Sitdown Games (Home Page)'],
      ];

      // container for all toggles
      const togglesContainer = document.createElement('div');
      togglesContainer.style.cssText = `
        background:#222;padding:10px;border-radius:10px;display:grid;gap:8px;
      `;

      // build each toggle row
      toggleOptions.forEach(([key, label]) => {
        const row = document.createElement('label');
        row.style.cssText = `
          display:flex;justify-content:space-between;align-items:center;
          padding:8px 10px;border-radius:8px;cursor:pointer;
          transition:.15s;background:#262626;
        `;

        // hover effect
        row.onmouseenter = () => (row.style.background = '#2d2d2d');
        row.onmouseleave = () => (row.style.background = '#262626');

        const on = settings[key];
        row.innerHTML = `
          <span style="font-size:13px">${label}</span>
          <input type="checkbox" id="${key}" ${on ? 'checked' : ''} style="display:none">
          <div class="tgl" style="
            width:36px;height:20px;border-radius:20px;
            background:${on ? '#16a34a' : '#444'};
            position:relative;transition:.15s;
          ">
            <div style="
              width:16px;height:16px;border-radius:50%;background:#fff;
              position:absolute;top:2px;left:${on ? '18px' : '2px'};
              transition:.15s;
            "></div>
          </div>
        `;

        const checkbox = row.querySelector('input');
        const toggle = row.querySelector('.tgl');
        const knob = toggle.querySelector('div');

        // handle toggle click
        row.onclick = (e) => {
          e.preventDefault();
          checkbox.checked = !checkbox.checked;
          toggle.style.background = checkbox.checked ? '#16a34a' : '#444';
          knob.style.left = checkbox.checked ? '18px' : '2px';
        };

        togglesContainer.appendChild(row);
      });

      // buttons container
      const buttonRow = document.createElement('div');
      buttonRow.style.cssText = `
        display:flex;justify-content:flex-end;gap:8px;margin-top:14px;
      `;

      // close animation + cleanup
      const closeModal = () => {
        modal.style.transform = 'scale(.96) translateY(12px)';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 200);
      };

      // reusable button factory
      const createButton = (text, bgColor, onClick) => {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
          padding:8px 14px;border-radius:8px;border:1px solid ${bgColor};
          background:${bgColor};color:#fff;font-size:13px;cursor:pointer;
          transition:.15s;
        `;
        button.onmouseenter = () => (button.style.opacity = 0.85);
        button.onmouseleave = () => (button.style.opacity = 1);
        button.onclick = onClick;
        return button;
      };

      // add buttons
      buttonRow.append(
        createButton('Cancel', '#333', closeModal),
        createButton('Save', '#16a34a', () => {
          const newSettings = {};
          toggleOptions.forEach(([key]) => {
            newSettings[key] = document.getElementById(key).checked;
          });

          localStorage.setItem(
            'ROLOCATE_editremoveads',
            JSON.stringify(newSettings)
          );

          // feedback stuff
          ConsoleLogEnabled('Ad settings saved:', newSettings);
          notifications('Settings saved', 'success', '👍', '5000');

          closeModal();
        })
      );

      // assemble modal
      modal.append(togglesContainer, buttonRow);
      overlay.append(modal);
      document.body.append(overlay);

      // animate in
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'scale(1) translateY(0)';
      });
    }

    /*******************************************************
    name of function: removeAds
    description: remove roblox ads
    *******************************************************/
    function removeAds() {
        if (localStorage.getItem("ROLOCATE_removeads") !== "true") {
            return;
        }

        const userSettings = JSON.parse(localStorage.getItem("ROLOCATE_editremoveads") || '{}');
        const defaultSettings = {
            adIframes: true,
            sponsoredGames: true,
            sponsoredSections: true,
            todaysPicks: true,
            recommendedForYou: true,
            feedItems: true,
            standoutGames: true,
            sitdownGames: true
        };// if no settings use default settings
        const settings = { ...defaultSettings, ...userSettings };

        const doneMap = new WeakMap();
        let isRunning = false;

        /*******************************************************
        name of function: removeElements
        description: remove the roblox elements where ads and specific sections are in
        no script removal to avoid conflicts
        *******************************************************/
        function removeElements() {
            // prevent multiple runs at same time
            if (isRunning) return;
            isRunning = true;

            // helper: hide an element once and mark it done
            const hide = (el) => {
                if (doneMap.get(el)) return;
                el.style.display = "none";
                doneMap.set(el, true);
            };

            try {
                // block ad iframes if enabled by roblox for some reason
                if (settings.adIframes) {
                    document.querySelectorAll(`
                        .ads-container iframe,
                        .abp iframe,
                        .abp-spacer iframe,
                        .abp-container iframe,
                        .top-abp-container iframe,
                        #AdvertisingLeaderboard iframe,
                        #AdvertisementRight iframe,
                        #MessagesAdSkyscraper iframe,
                        .Ads_WideSkyscraper iframe,
                        .profile-ads-container iframe,
                        #ad iframe,
                        iframe[src*="roblox.com/user-sponsorship/"]
                    `).forEach(iframe => {
                        if (!doneMap.get(iframe)) {
                            // hide instead of remove cause no want page break
                            iframe.style.display = "none";
                            iframe.style.visibility = "hidden";
                            doneMap.set(iframe, true);
                        }
                    });
                }

                // block sponsored game cards if enabled
                if (settings.sponsoredGames) {
                    document.querySelectorAll(".game-card-native-ad").forEach(ad => {
                        if (!doneMap.get(ad)) {
                            const gameCard = ad.closest(".game-card-container");
                            if (gameCard) hide(gameCard);
                            doneMap.set(ad, true);
                        }
                    });
                }

                // block carousel sections by header name
                const carouselBlockList = [
                    settings.sponsoredSections  && /^sponsored$/i,
                    settings.todaysPicks        && /today's picks(:|$)/i,
                    settings.standoutGames      && /standout games/i,
                    settings.sitdownGames       && /sitdown games/i,
                ].filter(Boolean);

                if (carouselBlockList.length) {
                    document.querySelectorAll('.game-sort-carousel-wrapper').forEach(wrapper => {
                        if (doneMap.get(wrapper)) return;
                        const headerText = wrapper.querySelector('[data-testid="text-icon-row-text"]')?.textContent.trim();
                        if (headerText && carouselBlockList.some(rx => rx.test(headerText))) {
                            hide(wrapper);
                        }
                    });
                }

                // block "recommended for you" section if enabled
                if (settings.recommendedForYou) {
                    document.querySelectorAll('[data-testid="home-page-game-grid"]').forEach(hide);
                }

                // block feed items if enabled
                if (settings.feedItems) {
                    document.querySelectorAll(".sdui-feed-item-container").forEach(hide);
                }

            } finally {
                isRunning = false;
            }
        }

        // no comment
        let timeoutId;
        const observer = new MutationObserver(() => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(removeElements, 100);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // wait a bit before initial run to let ublock orgin do its thing first if its installed
        // im a master at glitch fixing ikr
        setTimeout(removeElements, 100);
    }

    /*******************************************************
    name of function: changeServerCount
    description: gui to cyhange autoservergion count
    *******************************************************/
    function ChangeAutoServerRegionCount () {
      const currentCount = localStorage.getItem('ROLOCATE_AutoRunServerRegionsnumber') || '16';

      // create dark overlay
      const overlay = document.createElement('div');
      overlay.id = 'rolocate-server-count-modal';
      overlay.style.cssText = `
        position:fixed;inset:0;display:flex;justify-content:center;align-items:center;
        background:rgba(0,0,0,.45);z-index:10000;opacity:0;transition:.2s;
      `;

      // main modal box
      const modal = document.createElement('div');
      modal.style.cssText = `
        background:#181818;border-radius:14px;padding:18px;width:340px;max-width:92vw;
        color:#fff;border:1px solid #2f2f2f;box-shadow:0 10px 30px rgba(0,0,0,.6);
        transform:scale(.96) translateY(12px);transition:.2s;
      `;

      // title + input + buttons
      modal.innerHTML = `
        <h2 style="margin:0;font-size:18px;text-align:center"># of Servers to Search</h2>
        <h4 style="margin:0;font-size:13px;color:#888;text-align:center">Default is 16 (Range: 1–700)</h4>
        <input type="number" value="${currentCount}" min="1" max="700"
          style="
            width:100%;padding:8px;margin:12px 0 14px;
            border-radius:8px;border:1px solid #444;background:#222;color:#fff;
            font-size:14px;
          "
        >
      `;

      const input = modal.querySelector('input');

      // buttons container
      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;';

      // helper to make buttons
      const makeBtn = (text, bg, fn) => {
        const b = document.createElement('button');
        b.textContent = text;
        b.style.cssText = `
          padding:8px 14px;border-radius:8px;border:1px solid ${bg};
          background:${bg};color:#fff;font-size:13px;cursor:pointer;transition:.15s;
        `;
        b.onmouseenter = () => b.style.opacity = .85;
        b.onmouseleave = () => b.style.opacity = 1;
        b.onclick = fn;
        return b;
      };

      // fade out modal
      const closeModal = () => {
        modal.style.transform = 'scale(.96) translateY(12px)';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 200);
      };

      // add cancel + save buttons
      const cancelBtn = makeBtn('Cancel', '#333', closeModal);
      const saveBtn = makeBtn('Save', '#16a34a', () => {
        const val = parseInt(input.value);
        if (val >= 1 && val <= 700) {
          localStorage.setItem('ROLOCATE_AutoRunServerRegionsnumber', val.toString());
          saveBtn.textContent = '✓ Saved!';
          saveBtn.style.background = '#10b981';
          setTimeout(() => closeModal(), 1000);
        } else {
          notifications("Please enter a valid number from 1-700", "warning", "", 4000);
        }
      });

      btnRow.append(cancelBtn, saveBtn);
      modal.append(btnRow);
      overlay.append(modal);
      document.body.append(overlay);

      // animate in like editRemoveAds
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'scale(1) translateY(0)';
      });

      // focus input
      input.focus();

      // click outside closes
      overlay.onclick = (e) => {
        if (e.target === overlay) closeModal();
      };
    }

    /*******************************************************
    name of function: editserverregions
    description: popup for customizing allowed/banned server regions
    *******************************************************/
    function editserverregions() {
      // don't open it twice
      if (document.getElementById('rolocate-region-settings-modal')) return;

      // ensure server regions are loaded
      if (typeof window.loadServerRegions === 'function') {
        window.loadServerRegions();
      }

      // preload flag data
      getFlagEmoji();

      // get all unique locations from the library
      const locations = window.serverRegionsByIp?._locations || {};

      // load saved settings or create defaults (all allowed)
      const savedSettings = JSON.parse(
        localStorage.getItem('ROLOCATE_serverRegions') || '{}'
      );

      // create default settings with all regions allowed
      const defaultSettings = {};
      Object.keys(locations).forEach(locationId => {
        const location = locations[locationId];
        const key = `${location.city}_${location.country.code}`;
        defaultSettings[key] = savedSettings[key] !== undefined ? savedSettings[key] : 'allowed';
      });

      const settings = { ...defaultSettings };

      // dark background overlay
      const overlay = document.createElement('div');
      overlay.id = 'rolocate-region-settings-modal';
      overlay.style.cssText = `
        position:fixed;inset:0;display:flex;justify-content:center;align-items:center;
        background:rgba(0,0,0,.45);z-index:10000;opacity:0;transition:.2s;
      `;

      // main modal box
      const modal = document.createElement('div');
      modal.className = 'dummy-class-for-server-region-edit-so-restoreclassicterms-can-target-this'; // yea ik im the best at naming stuff
      modal.style.cssText = `
        background:#181818;border-radius:14px;padding:18px;width:420px;max-width:92vw;
        max-height:85vh;color:#fff;border:1px solid #2f2f2f;
        box-shadow:0 10px 30px rgba(0,0,0,.6);
        transform:scale(.96) translateY(12px);transition:.2s;
        display:flex;flex-direction:column;
      `;

      // title + subtitle
      const header = document.createElement('div');
      header.innerHTML = `
        <h2 style="margin:0;font-size:18px;text-align:center">Server Region Settings</h2>
        <p style="margin:0px 0 0px;text-align:center;font-size:12px;color:#aaa">
          Only join servers from enabled regions
        </p>
        <p style="margin:0px 0 6px;text-align:center;font-size:12px;color:#aaa">
          Affects ServerHop, Server Regions, and Best Connection
        </p>
      `;

      // scrollable container for toggles
      const scrollContainer = document.createElement('div');
      scrollContainer.style.cssText = `
        overflow-y:auto;max-height:50vh;
      `;

      // container for all toggles
      const togglesContainer = document.createElement('div');
      togglesContainer.style.cssText = `
        background:#222;padding:10px;border-radius:10px;display:grid;gap:8px;
      `;

      // build toggle for each unique region
      const uniqueRegions = {};
      Object.keys(locations).forEach(locationId => {
        const location = locations[locationId];
        const key = `${location.city}_${location.country.code}`;
        if (!uniqueRegions[key]) {
          uniqueRegions[key] = location;
        }
      });

      // sort regions alphabetically by city
      const sortedKeys = Object.keys(uniqueRegions).sort((a, b) => {
        return uniqueRegions[a].city.localeCompare(uniqueRegions[b].city);
      });

      sortedKeys.forEach(key => {
        const location = uniqueRegions[key];
        const isAllowed = settings[key] === 'allowed';

        const row = document.createElement('label');
        row.style.cssText = `
          display:flex;justify-content:space-between;align-items:center;
          padding:8px 10px;border-radius:8px;cursor:pointer;
          transition:.15s;background:#262626;
        `;

        // hover effect
        row.onmouseenter = () => (row.style.background = '#2d2d2d');
        row.onmouseleave = () => (row.style.background = '#262626');

        // create flag element
        const flagImg = getFlagEmoji(location.country.code);
        if (flagImg) {
          flagImg.style.borderRadius = '3px';
          flagImg.style.objectFit = 'cover';
          flagImg.style.marginRight = '10px';
        }

        // create left side container
        const leftContainer = document.createElement('div');
        leftContainer.style.cssText = 'display:flex;align-items:center;gap:10px;flex:1;';

        if (flagImg) {
          leftContainer.appendChild(flagImg);
        }

        const textContainer = document.createElement('div');
        textContainer.style.cssText = 'display:flex;flex-direction:column;gap:2px;';
        textContainer.innerHTML = `
          <span style="font-size:13px;font-weight:500">${location.city}, ${location.country.code}</span>
          <span style="font-size:11px;color:#888">${location.region.name}</span>
        `;
        leftContainer.appendChild(textContainer);

        // create checkbox (hidden)
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = key;
        checkbox.checked = isAllowed;
        checkbox.style.display = 'none';

        // create toggle switch
        const toggle = document.createElement('div');
        toggle.className = 'tgl';
        toggle.style.cssText = `
          width:36px;height:20px;border-radius:20px;
          background:${isAllowed ? '#16a34a' : '#dc2626'};
          position:relative;transition:.15s;flex-shrink:0;
        `;

        const knob = document.createElement('div');
        knob.style.cssText = `
          width:16px;height:16px;border-radius:50%;background:#fff;
          position:absolute;top:2px;left:${isAllowed ? '18px' : '2px'};
          transition:.15s;
        `;
        toggle.appendChild(knob);

        // assemble row
        row.appendChild(leftContainer);
        row.appendChild(checkbox);
        row.appendChild(toggle);

        // handle toggle click
        row.onclick = (e) => {
          e.preventDefault();
          checkbox.checked = !checkbox.checked;
          toggle.style.background = checkbox.checked ? '#16a34a' : '#dc2626';
          knob.style.left = checkbox.checked ? '18px' : '2px';
        };

        togglesContainer.appendChild(row);
      });

      scrollContainer.appendChild(togglesContainer);

      // buttons container
      const buttonRow = document.createElement('div');
      buttonRow.style.cssText = `
        display:flex;justify-content:space-between;gap:8px;margin-top:14px;
      `;

      // reusable button factory
      const createButton = (text, bgColor, onClick) => {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
          padding:8px 14px;border-radius:8px;border:1px solid ${bgColor};
          background:${bgColor};color:#fff;font-size:13px;cursor:pointer;
          transition:.15s;flex:1;
        `;
        button.onmouseenter = () => (button.style.opacity = 0.85);
        button.onmouseleave = () => (button.style.opacity = 1);
        button.onclick = onClick;
        return button;
      };

      // close animation & cleanup
      const closeModal = () => {
        modal.style.transform = 'scale(.96) translateY(12px)';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 200);
      };

      // add buttons
      const leftButtons = document.createElement('div');
      leftButtons.style.cssText = 'display:flex;gap:8px;';

      const rightButtons = document.createElement('div');
      rightButtons.style.cssText = 'display:flex;gap:8px;';

      leftButtons.append(
        createButton('Reset', '#0ea5e9', () => {
          sortedKeys.forEach(key => {
            const checkbox = document.getElementById(key);
            const row = checkbox.closest('label');
            const toggle = row.querySelector('.tgl');
            const knob = toggle.querySelector('div');

            checkbox.checked = true;
            toggle.style.background = '#16a34a';
            knob.style.left = '18px';
          });
        }, true),
        createButton('Disable All', '#bf7c0a', () => {
          sortedKeys.forEach(key => {
            const checkbox = document.getElementById(key);
            const row = checkbox.closest('label');
            const toggle = row.querySelector('.tgl');
            const knob = toggle.querySelector('div');

            checkbox.checked = false;
            toggle.style.background = '#dc2626';
            knob.style.left = '2px';
          });
        }, true)
      );

      rightButtons.append(
        createButton('Cancel', '#333', closeModal),
        createButton('Save', '#16a34a', () => {
          const newSettings = {};
          sortedKeys.forEach(key => {
            const isChecked = document.getElementById(key).checked;
            newSettings[key] = isChecked ? 'allowed' : 'banned';
          });

          localStorage.setItem(
            'ROLOCATE_serverRegions',
            JSON.stringify(newSettings)
          );

          // feedback
          if (typeof ConsoleLogEnabled === 'function') {
            ConsoleLogEnabled('Server region settings saved:', newSettings);
          }
          if (typeof notifications === 'function') {
            notifications('Region settings saved', 'success', '🌍', '5000');
          }

          closeModal();
        })
      );

      buttonRow.append(leftButtons, rightButtons);

      // assemble modal
      modal.append(header, scrollContainer, buttonRow);
      overlay.append(modal);
      document.body.append(overlay);

      // animate in
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'scale(1) translateY(0)';
      });
    }

    /*******************************************************
    name of function: editprivateserversettings
    description: popup for customizing better private server settings
    *******************************************************/
    function editprivateserversettings() {
      const bpsEnabled = localStorage.getItem('ROLOCATE_betterprivateservers');
      if (bpsEnabled !== 'true') return;

      if (document.getElementById('rolocate-ps-settings-modal')) return;

      const defaultSettings = {
        compactPrivateServers: true,
        onlyYourPrivateServers: false,
        privateServerSearch: false
      };

      const savedSettings = JSON.parse(
        localStorage.getItem('ROLOCATE_editprivateserversettings') || '{}'
      );
      const settings = { ...defaultSettings, ...savedSettings };

      // Compact Private Servers is always on
      settings.compactPrivateServers = true;

      const overlay = document.createElement('div');
      overlay.id = 'rolocate-ps-settings-modal';
      overlay.style.cssText = `
        position:fixed;inset:0;display:flex;justify-content:center;align-items:center;
        background:rgba(0,0,0,.45);z-index:10000;opacity:0;transition:.2s;
      `;

      const modal = document.createElement('div');
      modal.style.cssText = `
        background:#181818;border-radius:14px;padding:18px;width:340px;max-width:92vw;
        color:#fff;border:1px solid #2f2f2f;box-shadow:0 10px 30px rgba(0,0,0,.6);
        transform:scale(.96) translateY(12px);transition:.2s;
      `;

      modal.innerHTML = `
        <h2 style="margin:0;font-size:18px;text-align:center">Private Server Settings</h2>
        <p style="margin:6px 0 0px;text-align:center;font-size:12px;color:#aaa">
          Change Settings for Private Servers
        </p>
      `;

      const toggleOptions = [
        ['compactPrivateServers', 'Compact Private Servers'],
        ['onlyYourPrivateServers', 'Only Your Private Servers'],
        ['privateServerSearch', 'Private Server Search']
      ];

      const togglesContainer = document.createElement('div');
      togglesContainer.style.cssText = `
        background:#222;padding:10px;border-radius:10px;display:grid;gap:8px;
      `;

      const toggleElements = {};

      toggleOptions.forEach(([key, label]) => {
        const isDisabled = key === 'compactPrivateServers';

        const row = document.createElement('label');
        row.style.cssText = `
          display:flex;justify-content:space-between;align-items:center;
          padding:8px 10px;border-radius:8px;
          cursor:${isDisabled ? 'not-allowed' : 'pointer'};
          transition:.15s;background:${isDisabled ? '#1a1a1a' : '#262626'};
          opacity:${isDisabled ? '0.6' : '1'};
        `;

        if (!isDisabled) {
          row.onmouseenter = () => (row.style.background = '#2d2d2d');
          row.onmouseleave = () => (row.style.background = '#262626');
        }

        row.innerHTML = `
          <span style="font-size:13px;color:${isDisabled ? '#888' : '#fff'}">${label}</span>
          <input type="checkbox" id="${key}" ${settings[key] ? 'checked' : ''} style="display:none">
          <div class="tgl" style="
            width:36px;height:20px;border-radius:20px;
            background:${settings[key] ? (isDisabled ? '#0d7a34' : '#16a34a') : '#444'};
            position:relative;transition:.15s;
          ">
            <div style="
              width:16px;height:16px;border-radius:50%;background:${isDisabled ? '#ccc' : '#fff'};
              position:absolute;top:2px;left:${settings[key] ? '18px' : '2px'};
              transition:.15s;
            "></div>
          </div>
        `;

        const checkbox = row.querySelector('input');
        const toggle = row.querySelector('.tgl');
        const knob = toggle.querySelector('div');

        toggleElements[key] = { checkbox, toggle, knob };

        if (!isDisabled) row.onclick = (e) => {
          e.preventDefault();
          const willBeChecked = !checkbox.checked;
          checkbox.checked = willBeChecked;
          toggle.style.background = willBeChecked ? '#16a34a' : '#444';
          knob.style.left = willBeChecked ? '18px' : '2px';

          // mutual exclusion between onlyYourPrivateServers and privateServerSearch
          const opposite = key === 'onlyYourPrivateServers' ? 'privateServerSearch' :
                           key === 'privateServerSearch' ? 'onlyYourPrivateServers' : null;
          if (opposite && willBeChecked && toggleElements[opposite]) {
            const o = toggleElements[opposite];
            o.checkbox.checked = false;
            o.toggle.style.background = '#444';
            o.knob.style.left = '2px';
          }
        };

        togglesContainer.appendChild(row);
      });

      const buttonRow = document.createElement('div');
      buttonRow.style.cssText = `
        display:flex;justify-content:flex-end;gap:8px;margin-top:14px;
      `;

      const createButton = (text, bgColor, onClick) => {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
          padding:8px 14px;border-radius:8px;border:1px solid ${bgColor};
          background:${bgColor};color:#fff;font-size:13px;cursor:pointer;
          transition:.15s;
        `;
        button.onmouseenter = () => (button.style.opacity = 0.85);
        button.onmouseleave = () => (button.style.opacity = 1);
        button.onclick = onClick;
        return button;
      };

      const closeModal = () => {
        modal.style.transform = 'scale(.96) translateY(12px)';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 200);
      };

      buttonRow.append(
        createButton('Cancel', '#333', closeModal),
        createButton('Save', '#16a34a', () => {
          const newSettings = {};
          toggleOptions.forEach(([key]) => {
            newSettings[key] = key === 'compactPrivateServers'
              ? true
              : document.getElementById(key).checked;
          });

          localStorage.setItem(
            'ROLOCATE_editprivateserversettings',
            JSON.stringify(newSettings)
          );

          ConsoleLogEnabled('Private server settings saved:', newSettings);
          notifications('Settings saved', 'success', '👍', '5000');

          closeModal();
        })
      );

      modal.append(togglesContainer, buttonRow);
      overlay.append(modal);
      document.body.append(overlay);

      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'scale(1) translateY(0)';
      });
    }

    /*******************************************************
     * Storage helpers
     * All non-file settings live in ONE localStorage key.
     * File data (base64) stays in its own key per type.
     *******************************************************/
    const SETTINGS_KEY = 'ROLOCATE_CUSTOMBACKGROUND_settings';

    function loadSettings() {
        try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; }
        catch { return {}; }
    }

    function saveSettings(patch) {
        const current = loadSettings();
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...patch }));
    }

    function resetSettings() {
        localStorage.removeItem(SETTINGS_KEY);
    }

    function getSetting(key, fallback = '') {
        const val = loadSettings()[key];
        return (val !== undefined && val !== null) ? val : fallback;
    }

    function getSavedFile(key) {
        const getter = typeof GM_getValue !== 'undefined' ? GM_getValue : k => localStorage.getItem(k);
        try { return JSON.parse(getter(`ROLOCATE_FILE_${key}`, null)); } catch { return null; }
    }

    function deleteSavedFile(key) {
        const deleter = typeof GM_deleteValue !== 'undefined' ? GM_deleteValue : k => localStorage.removeItem(k);
        deleter(`ROLOCATE_FILE_${key}`);
    }


    /*******************************************************
     * applycustombackgrounds()
     *******************************************************/
    async function applycustombackgrounds() {
        if (localStorage.getItem('ROLOCATE_custombackgrounds') !== 'true') return;

        const s               = loadSettings();
        const useVideo        = s.use_animated !== 'false';
        const videoURL        = s.video_url || '';
        const textColor       = s.text_color || '';
        const overrideText    = s.override_text_color === 'true';
        const useAdvanced     = s.use_advanced === 'true';
        const bgBlur          = parseFloat(s.blur ?? 0);
        const bgOpacity       = parseFloat(s.opacity ?? 1);
        const bgBrightness    = parseFloat(s.brightness ?? 1);
        const bgScale         = s.scale || 'cover';
        const bgBlendMode     = s.blend_mode || 'normal';
        const overlayColor    = s.overlay_color || '';
        const overlayOpacity  = parseFloat(s.overlay_opacity ?? 0);

        // Remove existing injected elements
        document.querySelectorAll('video[custom-bg], img[custom-bg], div[custom-bg-overlay], #custom-ui-style').forEach(el => el.remove());

        const bgElement = document.createElement(useVideo ? 'video' : 'img');
        bgElement.setAttribute('custom-bg', '');

        const filterParts = [];
        if (bgBlur > 0)         filterParts.push(`blur(${bgBlur}px)`);
        if (bgBrightness !== 1) filterParts.push(`brightness(${bgBrightness})`);

        bgElement.style.cssText = `
            position:fixed;top:0;left:0;width:100vw;height:100vh;
            object-fit:${bgScale};z-index:-9999;pointer-events:none;
            opacity:${bgOpacity};mix-blend-mode:${bgBlendMode};
            ${filterParts.length ? `filter:${filterParts.join(' ')};` : ''}
        `;
        if (useVideo) { bgElement.muted = true; bgElement.loop = true; bgElement.playsInline = true; }

        const savedFile = getSavedFile(useVideo ? 'video' : 'image');
        let hasBG = false;
        if (savedFile?.data) { bgElement.src = savedFile.data; hasBG = true; }
        else if (useVideo && videoURL) { bgElement.src = videoURL; hasBG = true; }

        if (hasBG) {
            if (useVideo) bgElement.play().catch(() => {});
            document.documentElement.appendChild(bgElement);
        } else if (overlayColor && overlayOpacity > 0) {
            const overlayEl = document.createElement('div');
            overlayEl.setAttribute('custom-bg-overlay', '');
            overlayEl.style.cssText = `
                position:fixed;top:0;left:0;width:100vw;height:100vh;
                background:${overlayColor};opacity:${overlayOpacity};
                z-index:-9998;pointer-events:none;
            `;
            document.documentElement.appendChild(overlayEl);
        }

        let css = hasBG ? `
            html, body, body.dark-theme, body.light-theme,
            #rbx-body, .rbx-body,
            #content, .content,
            #container-main, main.container-main,
            #footer-container, footer.container-footer
            { background: transparent !important; background-color: transparent !important; }
        ` : '';

        // Hide the cover gradient overlay
        css += `.cover-gradient-overlay { display: none !important; }`;

        if (useAdvanced) {
            const fallback = 'rgba(45,45,45,0.85)';
            const selectorMap = [
                ['#header,#header.rbx-header,.rbx-header,#header .container-fluid', 'header-bar'],
                ['#navigation,#navigation.rbx-left-col,#left-navigation-container,.rbx-left-col,.left-col-list,.simplebar-content', 'left-sidebar'],
                ['#navigation-container', 'sidebar-wrapper'],
                ...(hasBG ? [] : [
                    ['#container-main,main.container-main,#content', 'main-content'],
                    ['#footer-container,footer.container-footer', 'footer'],
                ]),
                ['.profile-header-top,.profile-avatar-section,.profile-header .prof', 'profile-header'],
                ['.profile-avatar-mask', 'avatar-mask'],
                ['.chat-body', 'chat-body'],
                ['.dropdown-menu', 'dropdown-menu'],
                ['.sticky-header-sorts,.filters-container,.filters-header-container,.catalog-search-options-top-bar', 'filters-bar'],
                ['.profile-avatar-left,.profile-avatar-gradient,.cover-blur-overlay', 'avatar-overlays'],
                ['.avatar-toggle-button,.foundation-web-button.bg-action-standard', 'avatar-toggle-btn'],
                ['#rbx-private-running-games,.server-list-section,.empty-game-instances-container,.no-servers-message', 'server-list-empty'],
                ['.catalog-header,.search-bars,.heading-container', 'catalog-header'],
                ['.mobile-search-container,.search-bar,.search-form,.input-group', 'search-bar'],
                ['.topic-container,.topic-carousel,.topic,.topic.unselected-topic', 'topic-chips'],
                ['.buy-btns-container,.shopping-cart-btn-container,.buy-robux,.shopping-cart-btn', 'action-buttons'],
                ['.groups-list-sidebar', 'groups-sidebar'],
                ['#populated-item-list,.item-list-container,.item-card,.item-card-container,.item-card-link,.item-card-caption', 'item-cards'],
                ['.catalog-header,.heading-container,.catalog-heading-container,.search-bars', 'catalog-header-bar'],
                ['.search-bar,.search-form,.input-group,.search-input,.input-field', 'search-inputs'],
                ['.topic-container,.topic-carousel,.topic,.topic.unselected-topic,.topic-navigation-button', 'topic-chips'],
                ['.catalog-search-options-top-bar,.filter-select,.filter-items-container,.btn-secondary-md', 'catalog-filters'],
                // rolocate stuff
                ['.rolocate-greeting-header,.rolocate-profile-frame',          'greeting-header'],
                ['.ROLOCATE_QUICKLAUNCHGAMES_new-games-container',              'quicklaunch'],
                ['.friend-carousel-container,.react-friends-carousel-container','friends-carousel'],
                ['.best-friends-section', 'best-friends'],
            ];
            selectorMap.forEach(([sel, key]) => {
                const color = s[`style_${key}`] || fallback;
                css += `${sel}{background-color:${color}!important}`;
            });
            // add this cause then borders look funnky af
            const borderTargets = [
                ['greeting-header',  '.rolocate-greeting-header,.rolocate-profile-frame'],
                ['quicklaunch',      '.ROLOCATE_QUICKLAUNCHGAMES_new-games-container'],
                ['friends-carousel', '.friend-carousel-container,.react-friends-carousel-container'],
                ['best-friends', '.best-friends-section'],
            ];
            borderTargets.forEach(([key, sel]) => {
                const color = s[`style_${key}`] || fallback;
                css += `${sel}{border-color:${color}!important;outline-color:${color}!important}`;
            });
            // we fix the like uhh quicklaunch thing by removing the shaddow
            css += `.ROLOCATE_QUICKLAUNCHGAMES_new-games-container{box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}`;
            css += `.ROLOCATE_QUICKLAUNCHGAMES_new-games-container *{text-shadow:none!important;filter:none!important}`;
            // sidebar stuff my eye is twitching while adding this btw. Thingk i got like 2 hours of sleep in the past 24 hours
            const sidebarText = s['style_sidebar-items-text'] || '#d0d0d0';
            css += `
                .left-col-list li:not(.rbx-upgrade-now),
                .left-col-list li:not(.rbx-upgrade-now):hover,
                .left-col-list a:not(#upgrade-now-button),
                .left-col-list li:not(.rbx-upgrade-now):hover > a
                {background:transparent!important;color:${sidebarText}!important}
            `;
        }

        if (overrideText && textColor) css += `body,body *{color:${textColor}!important}`;

        const styleTag = document.createElement('style');
        styleTag.id = 'custom-ui-style';
        styleTag.textContent = css;
        document.head.appendChild(styleTag);

        const transparentTargets = [
            '.rolocate-greeting-header', '.best-friends-section',
            '.friend-carousel-container', '.ROLOCATE_QUICKLAUNCHGAMES_new-games-container',
            '.react-friends-carousel-container',
        ];
        const transparencyStyle = document.createElement('style');
        transparencyStyle.id = 'rolocate-transparency-style';
        document.head.appendChild(transparencyStyle);

        function makeTransparent(selector) {
            if (!transparencyStyle.textContent.includes(selector)) {
                transparencyStyle.textContent += `${selector}{background:transparent!important;box-shadow:none!important;border-color:transparent!important}`;
            }
            document.querySelectorAll(selector).forEach(el => {
                el.style.background = el.style.backgroundColor = 'transparent';
                el.style.boxShadow = el.style.borderColor = 'none';
            });
        }

        function checkTransparency() {
            const bg = getComputedStyle(document.body).backgroundColor;
            if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') transparentTargets.forEach(makeTransparent);
            else transparencyStyle.textContent = '';
        }

        checkTransparency();

        if (hasBG) {
            const bgTransparencySelectors = [
                '#rbx-body', '.rbx-body',
                '#content', '.content',
                '#container-main', 'main.container-main',
                '#footer-container', 'footer.container-footer',
            ];
            const forceTransparent = () => {
                bgTransparencySelectors.forEach(sel => {
                    document.querySelectorAll(sel).forEach(el => {
                        el.style.setProperty('background', 'transparent', 'important');
                        el.style.setProperty('background-color', 'transparent', 'important');
                    });
                });
            };
            forceTransparent();
            new MutationObserver(forceTransparent).observe(document.documentElement, {
                childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'],
            });
        }

        new MutationObserver(checkTransparency).observe(document.body, {
            childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'],
        });
    }

    /*******************************************************
     * showSettingsPopup_background()
     *  // the ui for the background theme thingy
     *******************************************************/
    function showSettingsPopup_background() {

        // Save a file (image or video) to GM storage as base64
        async function saveFile(key, file) {
            const validImages = ['image/jpeg','image/jpg','image/png','image/gif','image/webp','image/bmp'];
            const validVideos = ['video/mp4','video/webm','video/ogg','video/quicktime'];
            if ((key === 'image' && !validImages.includes(file.type)) || (key === 'video' && !validVideos.includes(file.type))) {
                notifications(`Invalid file type: ${file.type}.`, 'error', '⚠️', 8000);
                return;
            }
            const WARN = 5 * 1024 * 1024, HARD = 20 * 1024 * 1024;
            if (file.size > HARD) { notifications('File exceeds 20 MB limit.', 'error', '⚠️', 8000); return; }
            if (file.size > WARN) notifications('Warning: large file may slow page loads. Consider using a direct link!', 'warning', '⚠️', 10000);
            if (typeof GM_setValue === 'undefined') { notifications('GM_setValue not available.', 'error', '⚠️', 8000); return; }
            const base64 = await new Promise((res, rej) => {
                const r = new FileReader();
                r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
            });
            GM_setValue(`ROLOCATE_FILE_${key}`, JSON.stringify({ name: file.name, size: file.size, type: file.type, data: base64 }));
        }

        // Remove any existing popup before rebuilding
        document.getElementById('rolocate-settings-overlay')?.remove();
        document.getElementById('rolocate-settings-popup')?.remove();

        // Inject scoped styles for the popup
        const styleTag = document.createElement('style');
        styleTag.textContent = `
            @keyframes rFadeIn  { from{opacity:0}   to{opacity:1} }
            @keyframes rSlideIn { from{opacity:0;transform:translate(-50%,-48%)scale(.97)} to{opacity:1;transform:translate(-50%,-50%)scale(1)} }
            @keyframes rTabIn   { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
            @keyframes rPresetIn{ from{opacity:0;transform:translateY(6px)}  to{opacity:1;transform:translateY(0)} }

            .r-toggle           { position:relative;display:inline-block;width:44px;height:24px;vertical-align:middle;flex-shrink:0 }
            .r-toggle input     { opacity:0;width:0;height:0 }
            .r-slider           { position:absolute;cursor:pointer;inset:0;background:#3a3a3a;border-radius:24px;transition:background .25s }
            .r-slider::before   { content:'';position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:#777;border-radius:50%;transition:transform .25s,background .25s }
            input:checked+.r-slider           { background:#2d5c45 }
            input:checked+.r-slider::before   { background:#5fb589;transform:translateX(20px) }

            .r-input            { width:100%;padding:9px 12px;background:#222;border:1px solid #383838;border-radius:7px;color:#d0d0d0;font-size:13px;box-sizing:border-box;transition:border-color .2s,background .2s }
            .r-input:focus      { outline:none;border-color:#5fb589;background:#2a2a2a }
            .r-card             { background:#212121;border-radius:10px;padding:18px;margin-bottom:12px;border:1px solid #2e2e2e;transition:border-color .2s }
            .r-card:hover       { border-color:#3a3a3a }
            .r-card-title       { color:#e8e8e8;margin:0 0 14px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;letter-spacing:.2px }
            .r-row              { display:flex;align-items:center;justify-content:space-between;padding:8px 0;gap:16px }
            .r-row-label        { font-size:13px;color:#bbb;line-height:1.4 }
            .r-helper           { font-size:11px;color:#666;margin:6px 0 0;line-height:1.5 }

            .r-slider-row       { display:flex;align-items:center;gap:10px;margin-top:8px }
            .r-slider-row label { font-size:11px;color:#888;width:80px;flex-shrink:0;text-transform:uppercase;letter-spacing:.4px }
            .r-range            { flex:1;-webkit-appearance:none;appearance:none;height:4px;background:#333;border-radius:4px;outline:none }
            .r-range::-webkit-slider-thumb { -webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#5fb589;cursor:pointer;transition:transform .15s }
            .r-range::-webkit-slider-thumb:hover { transform:scale(1.2) }
            .r-range-value      { font-size:11px;color:#888;min-width:36px;text-align:right;font-family:Consolas,monospace }

            .r-upload-zone      { margin-top:10px;padding:22px 16px;background:#1c1c1c;border:2px dashed #363636;border-radius:9px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s }
            .r-upload-zone:hover{ border-color:#5fb589;background:#202020 }
            .r-file-chip        { margin-top:10px;padding:10px 14px;background:#1c1c1c;border:1px solid #2e2e2e;border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:10px }
            .r-file-chip-info   { display:flex;align-items:center;gap:10px;color:#bbb;font-size:12px;min-width:0 }
            .r-file-chip-name   { white-space:nowrap;overflow:hidden;text-overflow:ellipsis }
            .r-remove-btn       { padding:5px 12px;background:#3a2222;color:#ff9999;border:1px solid #4d3333;border-radius:6px;cursor:pointer;font-size:11px;font-weight:500;flex-shrink:0;transition:background .15s }
            .r-remove-btn:hover { background:#4d3333;color:#ffbbbb }

            .r-tabs             { display:flex;gap:4px;margin-bottom:14px;background:#1c1c1c;padding:4px;border-radius:9px }
            .r-tab              { flex:1;padding:8px 6px;background:transparent;color:#777;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:500;transition:background .2s,color .2s }
            .r-tab:hover        { background:#262626;color:#aaa }
            .r-tab.active       { background:#2d5c45;color:#5fb589 }
            .r-tab-panel        { display:none }
            .r-tab-panel.active { display:block;animation:rTabIn .25s ease-out }

            .r-adv-grid         { display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin-top:10px }
            .r-adv-item         { padding:10px;background:#1c1c1c;border:1px solid #272727;border-radius:7px }
            .r-adv-item-label   { display:block;color:#888;font-size:10px;margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.5px }

            .r-btn              { padding:10px 20px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;border:none;transition:transform .15s,box-shadow .15s,background .15s }
            .r-btn-ghost        { background:#252525;color:#aaa;border:1px solid #363636 }
            .r-btn-ghost:hover  { background:#303030;color:#e0e0e0 }
            .r-btn-primary      { background:linear-gradient(135deg,#5fb589,#2d5c45);color:#fff;box-shadow:0 3px 10px rgba(95,181,137,.25) }
            .r-btn-primary:hover{ transform:translateY(-2px);box-shadow:0 6px 16px rgba(95,181,137,.35) }
            .r-btn-primary:active{ transform:translateY(0) }

            .r-preset-grid      { display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px }
            .r-preset-card      { border-radius:10px;overflow:hidden;cursor:pointer;border:2px solid transparent;transition:border-color .2s,transform .15s,box-shadow .2s;animation:rPresetIn .3s ease-out both }
            .r-preset-card:hover{ transform:translateY(-3px);box-shadow:0 8px 20px rgba(0,0,0,.5) }
            .r-preset-card.selected{ border-color:#5fb589;box-shadow:0 0 0 3px rgba(95,181,137,.2) }
            .r-preset-thumb     { height:72px;position:relative }
            .r-preset-name      { font-size:11px;font-weight:600;padding:6px 8px;background:#1c1c1c;color:#d0d0d0;text-align:center;letter-spacing:.3px }
            .r-select           { width:100%;padding:9px 12px;background:#222;border:1px solid #383838;border-radius:7px;color:#d0d0d0;font-size:13px;transition:border-color .2s;cursor:pointer }
            .r-select:focus     { outline:none;border-color:#5fb589 }
            .r-color-swatch     { width:38px;height:38px;border-radius:7px;border:none;cursor:pointer;padding:2px;background:none }

            .r-notice           { padding:10px 12px;background:#1c2a1c;border:1px solid #2d5c45;border-radius:7px;font-size:11px;color:#5fb589;margin-top:10px }
            .r-notice-warn      { background:#2a2200;border-color:#5c4a00;color:#c8a830 }
        `;
        document.head.appendChild(styleTag);

        // Overlay backdrop
        const overlay = document.createElement('div');
        overlay.id = 'rolocate-settings-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999998;animation:rFadeIn .2s';

        // Main popup container
        const popup = document.createElement('div');
        popup.id = 'rolocate-settings-popup';
        popup.style.cssText = `
            position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
            background:#191919;color:#d0d0d0;border:1px solid #2a2a2a;border-radius:14px;
            width:94%;max-width:540px;max-height:90vh;overflow:hidden;
            z-index:9999999;box-shadow:0 28px 56px rgba(0,0,0,.85);
            font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
            font-size:13px;display:flex;flex-direction:column;
            animation:rSlideIn .3s cubic-bezier(.16,1,.3,1);
        `;

        // Animate out and remove the popup
        function closePopup() {
            overlay.style.animation = 'rFadeIn .18s reverse';
            popup.style.animation   = 'rSlideIn .18s reverse';
            setTimeout(() => { overlay.remove(); popup.remove(); styleTag.remove(); }, 180);
        }

        // Header with title and close button
        const header = document.createElement('div');
        header.style.cssText = 'background:linear-gradient(135deg,#222,#1c1c1c);padding:16px 20px;border-bottom:1px solid #252525;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;';
        header.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px">
                <div style="width:34px;height:34px;background:linear-gradient(135deg,#5fb589,#2d5c45);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:17px">🎨</div>
                <div>
                    <div style="color:#fff;font-weight:600;font-size:15px">Custom Backgrounds</div>
                    <div style="color:#555;font-size:11px;margin-top:1px">Personalize The Roblox Website!</div>
                </div>
            </div>`;
        const closeButton = document.createElement('button');
        closeButton.textContent = '✕';
        closeButton.style.cssText = 'background:#252525;color:#777;border:none;width:30px;height:30px;font-size:14px;cursor:pointer;border-radius:7px;transition:background .15s,color .15s;flex-shrink:0;';
        closeButton.addEventListener('mouseover', () => { closeButton.style.background = '#333'; closeButton.style.color = '#fff'; });
        closeButton.addEventListener('mouseout',  () => { closeButton.style.background = '#252525'; closeButton.style.color = '#777'; });
        closeButton.addEventListener('click', closePopup);
        header.appendChild(closeButton);
        popup.appendChild(header);

        // Scrollable content area that holds all tab panels
        const contentArea = document.createElement('div');
        contentArea.style.cssText = 'padding:18px 20px;overflow-y:auto;flex:1;';

        // Tab bar at the top of the content area
        const tabBar = document.createElement('div');
        tabBar.className = 'r-tabs';
        tabBar.innerHTML = `
            <button class="r-tab active" data-panel="basic">Basic</button>
            <button class="r-tab" data-panel="filters">Filters</button>
            <button class="r-tab" data-panel="appearance">Appearance</button>
            <button class="r-tab" data-panel="advanced">Advanced</button>
            <button class="r-tab" data-panel="presets">Presets ✨</button>
        `;
        contentArea.appendChild(tabBar);

        // Helper: builds a labeled range slider row and wires up its live value display
        function makeRangeRow(labelText, settingKey, min, max, step, defaultVal, suffix = '') {
            const currentVal = parseFloat(getSetting(settingKey) !== '' ? getSetting(settingKey) : defaultVal);
            const row = document.createElement('div');
            row.className = 'r-slider-row';
            row.innerHTML = `
                <label>${labelText}</label>
                <input type="range" class="r-range" data-setting="${settingKey}" min="${min}" max="${max}" step="${step}" value="${currentVal}">
                <span class="r-range-value">${currentVal}${suffix}</span>
            `;
            const rangeInput   = row.querySelector('.r-range');
            const valueDisplay = row.querySelector('.r-range-value');
            rangeInput.addEventListener('input', () => {
                valueDisplay.textContent = parseFloat(rangeInput.value).toFixed(step < 1 ? 2 : 0) + suffix;
            });
            return row;
        }

        // BASIC TAB - video/image source selection and upload
        const basicPanel = document.createElement('div');
        basicPanel.className = 'r-tab-panel active';
        basicPanel.dataset.panel = 'basic';
        basicPanel.innerHTML = `
            <div class="r-card">
                <h3 class="r-card-title">🎬 Background Type</h3>
                <div class="r-row">
                    <span class="r-row-label">Animated video background</span>
                    <label class="r-toggle">
                        <input type="checkbox" id="rBG-use-animated" ${getSetting('use_animated', 'true') !== 'false' ? 'checked' : ''}>
                        <span class="r-slider"></span>
                    </label>
                </div>
                <p class="r-helper">Toggle between a looping video or a static image.</p>
            </div>
            <div class="r-card" id="rBG-video-section">
                <h3 class="r-card-title">📹 Video Background</h3>
                <label style="display:block;color:#999;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Direct URL</label>
                <input type="text" id="rBG-video-url" class="r-input" value="${sanitizeAttribute(getSetting('video_url'))}" placeholder="https://example.com/background.mp4">
                <p class="r-helper">Or upload a file below (max 5 MB recommended; 20 MB hard limit).</p>
                <input type="file" id="rBG-video-file-input" accept="video/*" style="display:none">
                <div class="r-upload-zone" id="rBG-video-upload-zone">
                    <div style="font-size:26px;margin-bottom:6px">📤</div>
                    <div style="color:#b0b0b0;font-size:13px;font-weight:500;margin-bottom:3px">Upload Video</div>
                    <div style="color:#666;font-size:11px">MP4 · WebM · OGG</div>
                </div>
                <div id="rBG-video-file-preview"></div>
            </div>
            <div class="r-card" id="rBG-image-section">
                <h3 class="r-card-title">🖼️ Image Background</h3>
                <p class="r-helper" style="margin-bottom:10px">Upload a static image (max 5 MB recommended; 20 MB hard limit).</p>
                <input type="file" id="rBG-image-file-input" accept="image/*" style="display:none">
                <div class="r-upload-zone" id="rBG-image-upload-zone">
                    <div style="font-size:26px;margin-bottom:6px">📤</div>
                    <div style="color:#b0b0b0;font-size:13px;font-weight:500;margin-bottom:3px">Upload Image</div>
                    <div style="color:#666;font-size:11px">JPG · PNG · GIF · WebP</div>
                </div>
                <div id="rBG-image-file-preview"></div>
            </div>
        `;
        contentArea.appendChild(basicPanel);

        // FILTERS TAB - blur, opacity, brightness, fit, blend, overlay
        const filtersPanel = document.createElement('div');
        filtersPanel.className = 'r-tab-panel';
        filtersPanel.dataset.panel = 'filters';

        // Filter sliders card
        const filtersCard = document.createElement('div');
        filtersCard.className = 'r-card';
        filtersCard.innerHTML = '<h3 class="r-card-title">🎛️ Background Filters</h3>';
        filtersCard.appendChild(makeRangeRow('Blur',       'blur',       0, 20, 0.5,  '0', 'px'));
        filtersCard.appendChild(makeRangeRow('Opacity',    'opacity',    0,  1, 0.05, '1', ''));
        filtersCard.appendChild(makeRangeRow('Brightness', 'brightness', 0,  2, 0.05, '1', ''));

        // Object-fit and blend mode dropdowns
        const fitCard = document.createElement('div');
        fitCard.className = 'r-card';
        fitCard.innerHTML = `
            <h3 class="r-card-title">📐 Fit &amp; Blend</h3>
            <div class="r-row">
                <span class="r-row-label">Object fit</span>
                <select id="rBG-scale" class="r-select" style="max-width:150px">
                    <option value="cover"   ${getSetting('scale', 'cover') === 'cover'   ? 'selected' : ''}>Cover (fill)</option>
                    <option value="contain" ${getSetting('scale', 'cover') === 'contain' ? 'selected' : ''}>Contain (letterbox)</option>
                    <option value="fill"    ${getSetting('scale', 'cover') === 'fill'    ? 'selected' : ''}>Stretch</option>
                    <option value="none"    ${getSetting('scale', 'cover') === 'none'    ? 'selected' : ''}>Original size</option>
                </select>
            </div>
            <div class="r-row" style="margin-top:4px">
                <span class="r-row-label">Blend mode</span>
                <select id="rBG-blend-mode" class="r-select" style="max-width:150px">
                    ${['normal','multiply','screen','overlay','darken','lighten','color-dodge','color-burn','hard-light','soft-light','difference','exclusion','hue','saturation','color','luminosity']
                        .map(mode => `<option value="${mode}" ${getSetting('blend_mode', 'normal') === mode ? 'selected' : ''}>${mode.charAt(0).toUpperCase() + mode.slice(1)}</option>`)
                        .join('')}
                </select>
            </div>
        `;

        // Color overlay card (only visible when no background is set)
        const overlayCard = document.createElement('div');
        overlayCard.className = 'r-card';
        const overlayColorVal   = getSetting('overlay_color', '#000000');
        const overlayOpacityVal = parseFloat(getSetting('overlay_opacity', '0'));
        overlayCard.innerHTML = `
            <h3 class="r-card-title">🌈 Color Overlay</h3>
            <div class="r-notice r-notice-warn">
                ⚠️ The color overlay only appears when <strong>no custom background</strong> is uploaded or set.
                With a video or image loaded it is automatically hidden so your background shows through cleanly.
            </div>
            <div style="display:flex;align-items:center;gap:10px;margin-top:12px">
                <input type="color" id="rBG-overlay-color" value="${sanitizeColor(overlayColorVal)}" class="r-color-swatch" style="width:48px;height:38px">
                <input type="text"  id="rBG-overlay-color-hex" class="r-input" value="${sanitizeColor(overlayColorVal)}" style="font-family:Consolas,monospace;font-size:12px;max-width:110px">
                <span style="font-size:11px;color:#666;flex:1">Overlay tint color</span>
            </div>
        `;
        overlayCard.appendChild(makeRangeRow('Intensity', 'overlay_opacity', 0, 1, 0.05, overlayOpacityVal.toString(), ''));

        filtersPanel.append(filtersCard, fitCard, overlayCard);
        contentArea.appendChild(filtersPanel);

        // APPEARANCE TAB - text color override
        const appearancePanel = document.createElement('div');
        appearancePanel.className = 'r-tab-panel';
        appearancePanel.dataset.panel = 'appearance';
        const savedTextColor = sanitizeColor(getSetting('text_color', '#ffffff'));
        const textOverrideOn = getSetting('override_text_color') === 'true';
        appearancePanel.innerHTML = `
            <div class="r-card">
                <h3 class="r-card-title">🎨 Text Color Override</h3>
                <div class="r-row">
                    <span class="r-row-label">Override all text color</span>
                    <label class="r-toggle">
                        <input type="checkbox" id="rBG-override-text-color" ${textOverrideOn ? 'checked' : ''}>
                        <span class="r-slider"></span>
                    </label>
                </div>
                <div id="rBG-text-color-group" style="margin-top:14px;transition:opacity .2s;${textOverrideOn ? '' : 'opacity:.35;pointer-events:none'}">
                    <div style="display:flex;align-items:center;gap:10px">
                        <input type="color" id="rBG-text-color" value="${savedTextColor}" class="r-color-swatch" style="width:48px;height:48px">
                        <input type="text"  id="rBG-text-color-hex" class="r-input" value="${savedTextColor}" style="font-family:Consolas,monospace;text-align:center;font-size:12px;max-width:110px">
                        <div style="flex:1;padding:13px 16px;background:#222;border-radius:8px;border:1px solid #333;text-align:center">
                            <span id="rBG-text-color-preview" style="font-size:13px;font-weight:600;color:${savedTextColor}">Preview Text</span>
                        </div>
                    </div>
                    <p class="r-helper">Forces every text element on the page to this color.</p>
                </div>
            </div>
        `;
        contentArea.appendChild(appearancePanel);

        // ADVANCED TAB - per-element background color overrides
        const advancedPanel = document.createElement('div');
        advancedPanel.className = 'r-tab-panel';
        advancedPanel.dataset.panel = 'advanced';
        const advancedEnabled = getSetting('use_advanced') === 'true';
        advancedPanel.innerHTML = `
            <div class="r-card">
                <h3 class="r-card-title">⚙️ Advanced UI Styling</h3>
                <div class="r-row">
                    <span class="r-row-label">Enable element-level background overrides</span>
                    <label class="r-toggle">
                        <input type="checkbox" id="rBG-use-advanced" ${advancedEnabled ? 'checked' : ''}>
                        <span class="r-slider"></span>
                    </label>
                </div>
                <p class="r-helper" style="color:#b05050;margin-bottom:12px">Here you can individually change each element of the roblox page!</p>
                <div id="rBG-adv-controls" style="${advancedEnabled ? '' : 'display:none'}">
                    <div style="padding:14px;background:#1a1a1a;border:1px solid #2e2e2e;border-radius:9px;margin-bottom:14px">
                        <div class="r-row" style="padding:0 0 10px">
                            <span style="font-size:12px;font-weight:600;color:#ccc">🎨 Apply to all elements at once</span>
                            <label class="r-toggle">
                                <input type="checkbox" id="rBG-adv-global-toggle">
                                <span class="r-slider"></span>
                            </label>
                        </div>
                        <div id="rBG-adv-global-inputs" style="opacity:.35;pointer-events:none;transition:opacity .2s">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                                <input type="color" id="rBG-adv-global-color" class="r-color-swatch" value="#1a1a1a" style="width:36px;height:32px">
                                <div id="rBG-adv-global-preview" style="flex:1;height:32px;border-radius:6px;border:1px solid #333"></div>
                            </div>
                            <div style="display:flex;align-items:center;gap:8px">
                                <span style="font-size:10px;color:#666;width:52px;flex-shrink:0">Opacity</span>
                                <input type="range" class="r-range" id="rBG-adv-global-opacity" min="0" max="100" step="1" value="90">
                                <span id="rBG-adv-global-opacity-val" style="font-size:11px;color:#888;min-width:32px;text-align:right;font-family:Consolas,monospace">90%</span>
                            </div>
                            <button id="rBG-adv-global-apply" style="margin-top:10px;width:100%;padding:8px;background:#2d5c45;color:#5fb589;border:none;border-radius:7px;cursor:pointer;font-size:12px;font-weight:600;transition:background .15s">Apply to all elements</button>
                        </div>
                    </div>
                    <div class="r-adv-grid" id="rBG-adv-grid"></div>
                </div>
            </div>
        `;
        contentArea.appendChild(advancedPanel);

        // PRESETS TAB - themes
        const PRESET_PROTECTED_KEYS = new Set(['use_animated', 'video_url']);

        // Element keys that get the shared uiColor applied when a preset is used
        const PRESET_UI_KEYS = [
            'header-bar', 'left-sidebar', 'sidebar-wrapper', 'main-content',
            'footer', 'profile-header', 'avatar-mask', 'chat-body', 'dropdown-menu',
            'filters-bar', 'avatar-overlays', 'avatar-toggle-btn', 'server-list-empty',
            'catalog-header', 'search-bar', 'topic-chips', 'action-buttons',
            'groups-sidebar', 'item-cards', 'catalog-header-bar', 'search-inputs',
            'catalog-filters', 'greeting-header', 'quicklaunch', 'friends-carousel',
            'best-friends',
            // note: 'sidebar-items-text' is intentionally excluded
        ];

        // Helper: expands a single rgba string into all the style_ keys for a preset
        function buildPresetStyles(rgbaColor) {
            const out = {};
            PRESET_UI_KEYS.forEach(k => { out[`style_${k}`] = rgbaColor; });
            return out;
        }

        const PRESETS = [
            { id: 'oleddark',  name: 'Oled Dark',  thumb: 'linear-gradient(135deg,#000000,#000000,#000000)',
              settings: { blur:'0', opacity:'1', brightness:'1', scale:'cover', blend_mode:'normal', overlay_color:'#000000', overlay_opacity:'0.4',  use_advanced:'true', ...buildPresetStyles('rgba(0,0,0,1)') }},
            { id: 'clean',     name: 'Clean Dark', thumb: 'linear-gradient(135deg,#141414,#1e1e1e,#191919)',
              settings: { blur:'0', opacity:'1', brightness:'1', scale:'cover', blend_mode:'normal', overlay_color:'#000000', overlay_opacity:'0',    use_advanced:'true', ...buildPresetStyles('rgba(24,24,24,1)') }},
            { id: 'ocean',     name: 'Ocean',      thumb: 'linear-gradient(135deg,#020e1a,#053a5c,#071f3a)',
              settings: { blur:'0', opacity:'1', brightness:'1', scale:'cover', blend_mode:'normal', overlay_color:'#000f1f', overlay_opacity:'0.35', use_advanced:'true', ...buildPresetStyles('rgba(3,22,42,1)') }},
            { id: 'forest',    name: 'Forest',     thumb: 'linear-gradient(135deg,#0d1f0f,#1a3d20,#0f2a1a)',
              settings: { blur:'0', opacity:'1', brightness:'1', scale:'cover', blend_mode:'normal', overlay_color:'#001a08', overlay_opacity:'0.3',  use_advanced:'true', ...buildPresetStyles('rgba(12,32,18,1)') }},
            { id: 'crimson',   name: 'Crimson',    thumb: 'linear-gradient(135deg,#1a0505,#3d0f0f,#1f0808)',
              settings: { blur:'0', opacity:'1', brightness:'1', scale:'cover', blend_mode:'normal', overlay_color:'#1a0000', overlay_opacity:'0.35', use_advanced:'true', ...buildPresetStyles('rgba(38,10,10,1)') }},
            { id: 'amber',     name: 'Amber',      thumb: 'linear-gradient(135deg,#1a0c00,#3d1e00,#261000)',
              settings: { blur:'0', opacity:'1', brightness:'1', scale:'cover', blend_mode:'normal', overlay_color:'#1a0800', overlay_opacity:'0.3',  use_advanced:'true', ...buildPresetStyles('rgba(35,17,0,1)') }},
            { id: 'violet',    name: 'Violet',     thumb: 'linear-gradient(135deg,#0e0520,#2a0d4f,#1a0838)',
              settings: { blur:'0', opacity:'1', brightness:'1', scale:'cover', blend_mode:'normal', overlay_color:'#0a0020', overlay_opacity:'0.35', use_advanced:'true', ...buildPresetStyles('rgba(20,8,50,1)') }},
            { id: 'rose',      name: 'Rose',       thumb: 'linear-gradient(135deg,#1a0510,#3d0f25,#280818)',
              settings: { blur:'0', opacity:'1', brightness:'1', scale:'cover', blend_mode:'normal', overlay_color:'#1a0010', overlay_opacity:'0.3',  use_advanced:'true', ...buildPresetStyles('rgba(40,8,22,1)') }},
            { id: 'slate',     name: 'Slate',      thumb: 'linear-gradient(135deg,#0d1014,#1c2530,#131a22)',
              settings: { blur:'0', opacity:'1', brightness:'1', scale:'cover', blend_mode:'normal', overlay_color:'#080c10', overlay_opacity:'0.3',  use_advanced:'true', ...buildPresetStyles('rgba(16,22,30,1)') }},
            { id: 'copper',    name: 'Copper',     thumb: 'linear-gradient(135deg,#1a0e00,#3d2500,#2e1800)',
              settings: { blur:'0', opacity:'1', brightness:'1', scale:'cover', blend_mode:'normal', overlay_color:'#150a00', overlay_opacity:'0.3',  use_advanced:'true', ...buildPresetStyles('rgba(38,22,0,1)') }},
            { id: 'teal',      name: 'Teal',       thumb: 'linear-gradient(135deg,#001a18,#003d36,#002820)',
              settings: { blur:'0', opacity:'1', brightness:'1', scale:'cover', blend_mode:'normal', overlay_color:'#001210', overlay_opacity:'0.3',  use_advanced:'true', ...buildPresetStyles('rgba(0,32,28,1)') }},
            { id: 'graphite',  name: 'Graphite',   thumb: 'linear-gradient(135deg,#181818,#2e2e2e,#222222)',
              settings: { blur:'0', opacity:'1', brightness:'1', scale:'cover', blend_mode:'normal', overlay_color:'#111111', overlay_opacity:'0.2',  use_advanced:'true', ...buildPresetStyles('rgba(30,30,30,1)') }},
        ];

        const presetsPanel = document.createElement('div');
        presetsPanel.className = 'r-tab-panel';
        presetsPanel.dataset.panel = 'presets';
        const presetsCard = document.createElement('div');
        presetsCard.className = 'r-card';
        presetsCard.innerHTML = `
            <h3 class="r-card-title">✨ Theme Presets</h3>
            <p class="r-helper" style="margin-bottom:6px">Pick a preset to apply a curated look. Fine-tune it in the other tabs afterwards.</p>
            <div class="r-notice" style="margin-bottom:14px">
                🎬 Your Background Videos Will Still Show Through.
            </div>
            <div class="r-preset-grid" id="rBG-preset-grid"></div>
            <div id="rBG-preset-active-label" style="display:none;margin-top:12px" class="r-notice">
                ✓ <span id="rBG-preset-active-name"></span> applied - hit Save &amp; Apply to keep it.
            </div>
        `;
        presetsPanel.appendChild(presetsCard);
        contentArea.appendChild(presetsPanel);
        popup.appendChild(contentArea);


        // Footer with reset and save buttons
        const footer = document.createElement('div');
        footer.style.cssText = 'padding:14px 20px;background:#1c1c1c;border-top:1px solid #252525;display:flex;justify-content:space-between;gap:10px;flex-shrink:0;';
        const resetButton = document.createElement('button');
        resetButton.className   = 'r-btn r-btn-ghost';
        resetButton.textContent = '🔄 Reset All';
        const saveButton = document.createElement('button');
        saveButton.className   = 'r-btn r-btn-primary';
        saveButton.textContent = '✓ Save & Apply';
        footer.append(resetButton, saveButton);
        popup.appendChild(footer);
        document.body.append(overlay, popup);


        // Shorthand to find elements inside the popup by id
        function find(id) { return popup.querySelector(`#${id}`); }

        // Cache all frequently accessed DOM references up front
        const useAnimatedToggle  = find('rBG-use-animated');
        const videoSection       = find('rBG-video-section');
        const imageSection       = find('rBG-image-section');
        const videoUrlInput      = find('rBG-video-url');
        const overrideTextToggle = find('rBG-override-text-color');
        const textColorGroup     = find('rBG-text-color-group');
        const textColorPicker    = find('rBG-text-color');
        const textColorHexInput  = find('rBG-text-color-hex');
        const textColorPreview   = find('rBG-text-color-preview');
        const useAdvancedToggle  = find('rBG-use-advanced');
        const advancedControls   = find('rBG-adv-controls');
        const advancedGrid       = find('rBG-adv-grid');
        const overlayColorPicker = find('rBG-overlay-color');
        const overlayColorHex    = find('rBG-overlay-color-hex');
        const presetGrid         = find('rBG-preset-grid');
        // These two are used in both applyPreset and collectAndSave, so cache them here
        const scaleEl            = find('rBG-scale');
        const blendEl            = find('rBG-blend-mode');


        // Tab click handler - switches active tab and panel
        tabBar.addEventListener('click', event => {
            const clickedTab = event.target.closest('.r-tab');
            if (!clickedTab) return;
            tabBar.querySelectorAll('.r-tab').forEach(tab => tab.classList.remove('active'));
            contentArea.querySelectorAll('.r-tab-panel').forEach(panel => panel.classList.remove('active'));
            clickedTab.classList.add('active');
            contentArea.querySelector(`.r-tab-panel[data-panel="${clickedTab.dataset.panel}"]`).classList.add('active');
        });

        // Sync visibility of sections based on toggle states
        function updateVisibility() {
            videoSection.style.display         = useAnimatedToggle.checked  ? 'block' : 'none';
            imageSection.style.display         = useAnimatedToggle.checked  ? 'none'  : 'block';
            textColorGroup.style.opacity       = overrideTextToggle.checked ? '1'     : '.35';
            textColorGroup.style.pointerEvents = overrideTextToggle.checked ? 'auto'  : 'none';
            advancedControls.style.display     = useAdvancedToggle.checked  ? 'block' : 'none';
            if (textColorPreview) textColorPreview.style.color = textColorPicker.value;
        }
        useAnimatedToggle.addEventListener('change', updateVisibility);
        overrideTextToggle.addEventListener('change', updateVisibility);
        useAdvancedToggle.addEventListener('change', updateVisibility);
        updateVisibility();


        // Global advanced color/opacity controls (apply one color to all elements)
        const globalToggle     = find('rBG-adv-global-toggle');
        const globalInputs     = find('rBG-adv-global-inputs');
        const globalColorPick  = find('rBG-adv-global-color');
        const globalPreview    = find('rBG-adv-global-preview');
        const globalOpacity    = find('rBG-adv-global-opacity');
        const globalOpacityVal = find('rBG-adv-global-opacity-val');
        const globalApplyBtn   = find('rBG-adv-global-apply');

        // Update the color preview swatch with the current color + opacity
        function updateGlobalPreview() {
            const alpha = Math.round((globalOpacity.value / 100) * 255).toString(16).padStart(2, '0');
            globalPreview.style.background = globalColorPick.value + alpha;
        }

        globalToggle.addEventListener('change', () => {
            globalInputs.style.opacity       = globalToggle.checked ? '1'    : '.35';
            globalInputs.style.pointerEvents = globalToggle.checked ? 'auto' : 'none';
        });
        globalColorPick.addEventListener('input', updateGlobalPreview);
        globalOpacity.addEventListener('input', () => {
            globalOpacityVal.textContent = globalOpacity.value + '%';
            updateGlobalPreview();
        });
        globalApplyBtn.addEventListener('mouseover', () => globalApplyBtn.style.background = '#3d7a5c');
        globalApplyBtn.addEventListener('mouseout',  () => globalApplyBtn.style.background = '#2d5c45');

        // Push the global color+opacity to every non-text element in the grid
        globalApplyBtn.addEventListener('click', () => {
            const [r, g, b] = hexToRgb(globalColorPick.value);
            const alpha      = (globalOpacity.value / 100).toFixed(2);
            advancedGrid.querySelectorAll('[data-key]').forEach(item => {
                const meta   = advancedStyleMap[item.dataset.key];
                if (meta.isText) return; // skip text color entries
                const picker = item.querySelector('.adv-color-pick');
                if (!picker) return;
                const opRange = item.querySelector('.adv-opacity-range');
                if (opRange) { opRange.value = globalOpacity.value; opRange.dispatchEvent(new Event('input')); }
                picker.value = globalColorPick.value;
                picker.dispatchEvent(new Event('input'));
            });
        });
        updateGlobalPreview();


        // Sync color picker <-> hex text input for text color
        textColorPicker.addEventListener('input', () => {
            textColorHexInput.value = textColorPicker.value;
            textColorPreview.style.color = textColorPicker.value;
        });
        textColorHexInput.addEventListener('input', () => {
            if (/^#[0-9A-F]{6}$/i.test(textColorHexInput.value)) {
                textColorPicker.value = textColorHexInput.value;
                textColorPreview.style.color = textColorHexInput.value;
            }
        });

        // Sync color picker <-> hex text input for overlay color
        if (overlayColorPicker && overlayColorHex) {
            overlayColorPicker.addEventListener('input', () => { overlayColorHex.value = overlayColorPicker.value; });
            overlayColorHex.addEventListener('input', () => {
                if (/^#[0-9A-F]{6}$/i.test(overlayColorHex.value)) overlayColorPicker.value = overlayColorHex.value;
            });
        }


        // Show a chip for any already-saved file, with a remove button
        function refreshFilePreview(type) {
            const savedFile  = getSavedFile(type);
            const previewDiv = find(`rBG-${type}-file-preview`);
            previewDiv.innerHTML = '';
            if (!savedFile) return;
            const chip = document.createElement('div');
            chip.className = 'r-file-chip';
            chip.innerHTML = `
                <div class="r-file-chip-info">
                    <span style="font-size:20px">${type === 'video' ? '📹' : '🖼️'}</span>
                    <div style="min-width:0">
                        <div class="r-file-chip-name"></div>
                        <div style="font-size:10px;color:#666;margin-top:2px">${(savedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                </div>
                <button class="r-remove-btn">Remove</button>
            `;
            chip.querySelector('.r-file-chip-name').textContent = savedFile.name;
            chip.querySelector('.r-remove-btn').addEventListener('click', () => {
                deleteSavedFile(type);
                find(`rBG-${type}-file-input`).value = '';
                refreshFilePreview(type);
            });
            previewDiv.appendChild(chip);
        }

        // Wire up click-to-upload for a given media type
        function setupFileUpload(type) {
            const fileInput  = find(`rBG-${type}-file-input`);
            const uploadZone = find(`rBG-${type}-upload-zone`);
            uploadZone.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', async event => {
                const file = event.target.files[0];
                if (!file) return;
                try { await saveFile(type, file); refreshFilePreview(type); }
                catch (err) { alert(err.message); fileInput.value = ''; }
            });
        }

        // Init file upload and preview for both types
        ['video', 'image'].forEach(t => { setupFileUpload(t); refreshFilePreview(t); });


        // Color utility functions used across the advanced grid and presets
        function parseColor(str) {
            const rgba = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (rgba) return { r: +rgba[1], g: +rgba[2], b: +rgba[3], a: rgba[4] !== undefined ? +rgba[4] : 1 };
            const hex = str.match(/^#([0-9a-f]{6})$/i);
            if (hex) {
                const n = parseInt(hex[1], 16);
                return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
            }
            return { r: 25, g: 25, b: 25, a: 0.9 }; // safe fallback
        }
        function toRgba(r, g, b, a)  { return `rgba(${r},${g},${b},${a})`; }
        function rgbToHex(r, g, b)   { return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join(''); }
        function hexToRgb(hex)       { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }


        // Map of all element keys for the advanced grid.
        // isText marks entries that are text color (no opacity slider).
        // Omitting isText defaults to false (background color + opacity).
        const advancedStyleMap = {
            'header-bar':         { label: 'Header Bar',         default: 'rgba(25,25,25,0.92)' },
            'left-sidebar':       { label: 'Left Sidebar',       default: 'rgba(22,22,22,0.90)' },
            'sidebar-wrapper':    { label: 'Sidebar Wrapper',    default: 'rgba(22,22,22,0.90)' },
            'main-content':       { label: 'Main Content',       default: 'rgba(28,28,28,0.85)' },
            'footer':             { label: 'Footer',             default: 'rgba(20,20,20,0.92)' },
            'profile-header':     { label: 'Profile Header',     default: 'rgba(24,24,24,0.88)' },
            'avatar-mask':        { label: 'Avatar Container',   default: 'rgba(26,26,26,0.90)' },
            'chat-body':          { label: 'Chat Body',          default: 'rgba(18,18,18,0.92)' },
            'dropdown-menu':      { label: 'Dropdown',           default: 'rgba(22,22,22,0.95)' },
            'filters-bar':        { label: 'Filters Bar',        default: 'rgba(22,22,22,0.90)' },
            'avatar-overlays':    { label: 'Avatar Overlays',    default: 'rgba(20,20,20,0.85)' },
            'avatar-toggle-btn':  { label: 'Avatar Toggle Btn',  default: 'rgba(30,30,30,0.95)' },
            'server-list-empty':  { label: 'Server List Empty',  default: 'rgba(24,24,24,0.88)' },
            'catalog-header':     { label: 'Catalog Header',     default: 'rgba(25,25,25,0.92)' },
            'search-bar':         { label: 'Search Bar',         default: 'rgba(22,22,22,0.90)' },
            'topic-chips':        { label: 'Topic Chips',        default: 'rgba(26,26,26,0.88)' },
            'action-buttons':     { label: 'Action Buttons',     default: 'rgba(28,28,28,0.95)' },
            'groups-sidebar':     { label: 'Groups Sidebar',     default: 'rgba(22,22,22,0.90)' },
            'item-cards':         { label: 'Item Cards',         default: 'rgba(26,26,26,0.90)' },
            'catalog-header-bar': { label: 'Catalog Header Bar', default: 'rgba(25,25,25,0.92)' },
            'search-inputs':      { label: 'Search Inputs',      default: 'rgba(22,22,22,0.90)' },
            'catalog-filters':    { label: 'Catalog Filters',    default: 'rgba(23,23,23,0.90)' },
            'greeting-header':  { label: 'Greeting Header',     default: 'rgba(26,26,26,0.90)' },
            'quicklaunch':      { label: 'Quick Launch Games',   default: 'rgba(26,28,35,0.90)' },
            'friends-carousel': { label: 'Friends Carousel',     default: 'rgba(26,28,35,0.90)' },
            'best-friends': { label: 'Best Friends', default: 'rgba(26,28,35,0.90)' },
            'sidebar-items-text': { label: 'Sidebar Text Color', default: '#d0d0d0', isText: true },
        };

        // Build each element's color card in the advanced grid
        Object.entries(advancedStyleMap).forEach(([key, meta]) => {
            const savedValue = getSetting(`style_${key}`, meta.default);
            const parsed     = parseColor(savedValue);

            const item = document.createElement('div');
            item.className = 'r-adv-item';
            item.style.cssText = 'padding:12px;';
            item.dataset.key = key;

            if (meta.isText) {
                // Text color entry: just a color picker, no opacity slider
                const hexVal = rgbToHex(parsed.r, parsed.g, parsed.b);
                item.innerHTML = `
                    <label class="r-adv-item-label">${escapeHtmlnoxssattackvectors(meta.label)}</label>
                    <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
                        <input type="color" class="r-color-swatch adv-color-pick" value="${hexVal}" style="width:36px;height:32px">
                        <div class="adv-color-preview" style="flex:1;height:32px;border-radius:6px;background:${hexVal};border:1px solid #333"></div>
                    </div>
                `;
                const picker  = item.querySelector('.adv-color-pick');
                const preview = item.querySelector('.adv-color-preview');
                picker.addEventListener('input', () => { preview.style.background = picker.value; });
            } else {
                // Background color entry: color picker + opacity slider
                const hexVal = rgbToHex(parsed.r, parsed.g, parsed.b);
                const opVal  = Math.round(parsed.a * 100);
                item.innerHTML = `
                    <label class="r-adv-item-label">${escapeHtmlnoxssattackvectors(meta.label)}</label>
                    <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
                        <input type="color" class="r-color-swatch adv-color-pick" value="${hexVal}" style="width:36px;height:32px">
                        <div class="adv-color-preview" style="flex:1;height:32px;border-radius:6px;border:1px solid #333;
                            background:linear-gradient(90deg,${hexVal}${Math.round(opVal * 2.55).toString(16).padStart(2, '00')},${hexVal}${Math.round(opVal * 2.55).toString(16).padStart(2, '00')})"></div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
                        <span style="font-size:10px;color:#666;width:52px;flex-shrink:0">Opacity</span>
                        <input type="range" class="r-range adv-opacity-range" min="0" max="100" step="1" value="${opVal}">
                        <span class="adv-opacity-val" style="font-size:11px;color:#888;min-width:32px;text-align:right;font-family:Consolas,monospace">${opVal}%</span>
                    </div>
                `;
                const picker  = item.querySelector('.adv-color-pick');
                const preview = item.querySelector('.adv-color-preview');
                const opRange = item.querySelector('.adv-opacity-range');
                const opLabel = item.querySelector('.adv-opacity-val');

                // Redraw the checkerboard-backed preview whenever color or opacity changes
                function updatePreview() {
                    const alpha = Math.round((opRange.value / 100) * 255).toString(16).padStart(2, '0');
                    preview.style.background = `${picker.value}${alpha}`;
                    preview.style.backgroundImage = `linear-gradient(${picker.value}${alpha},${picker.value}${alpha}),
                        repeating-conic-gradient(#444 0% 25%,#2a2a2a 0% 50%)`;
                    preview.style.backgroundSize = 'auto,8px 8px';
                    opLabel.textContent = opRange.value + '%';
                }
                picker.addEventListener('input', updatePreview);
                opRange.addEventListener('input', updatePreview);
                updatePreview();
            }

            advancedGrid.appendChild(item);
        });

        // Read current values from all advanced grid items and return as a patch object
        function readAdvancedValues() {
            const result = {};
            advancedGrid.querySelectorAll('[data-key]').forEach(item => {
                const key    = item.dataset.key;
                const meta   = advancedStyleMap[key];
                const picker = item.querySelector('.adv-color-pick');
                if (!picker) return;
                if (meta.isText) {
                    result[`style_${key}`] = picker.value;
                } else {
                    const opRange = item.querySelector('.adv-opacity-range');
                    const [r, g, b] = hexToRgb(picker.value);
                    const alpha = (opRange.value / 100).toFixed(2);
                    result[`style_${key}`] = toRgba(r, g, b, alpha);
                }
            });
            return result;
        }


        // Apply a preset: patch settings, update all UI controls to match
        function applyPreset(preset) {
            // Save non-protected keys immediately so they persist on next load
            const patch = {};
            Object.entries(preset.settings).forEach(([key, value]) => {
                if (!PRESET_PROTECTED_KEYS.has(key)) patch[key] = value;
            });
            saveSettings(patch);

            // Helper to update a range slider and fire its input event
            function setRange(settingKey, val) {
                const el = popup.querySelector(`.r-range[data-setting="${settingKey}"]`);
                if (!el) return;
                el.value = val;
                el.dispatchEvent(new Event('input'));
            }
            setRange('blur',            preset.settings.blur            ?? '0');
            setRange('opacity',         preset.settings.opacity         ?? '1');
            setRange('brightness',      preset.settings.brightness      ?? '1');
            setRange('overlay_opacity', preset.settings.overlay_opacity ?? '0');

            // Update dropdowns and overlay color picker
            if (scaleEl) scaleEl.value = preset.settings.scale      || 'cover';
            if (blendEl) blendEl.value = preset.settings.blend_mode || 'normal';
            if (overlayColorPicker) {
                overlayColorPicker.value = preset.settings.overlay_color || '#000000';
                if (overlayColorHex) overlayColorHex.value = overlayColorPicker.value;
            }

            // Push preset values into each advanced grid item
            useAdvancedToggle.checked = preset.settings.use_advanced === 'true';
            advancedGrid.querySelectorAll('[data-key]').forEach(item => {
                const key = item.dataset.key;
                const val = preset.settings[`style_${key}`];
                if (!val) return;
                const parsed = parseColor(val);
                const picker = item.querySelector('.adv-color-pick');
                if (!picker) return;
                picker.value = rgbToHex(parsed.r, parsed.g, parsed.b);
                const opRange = item.querySelector('.adv-opacity-range');
                if (opRange) {
                    opRange.value = Math.round(parsed.a * 100);
                    opRange.dispatchEvent(new Event('input'));
                } else {
                    picker.dispatchEvent(new Event('input'));
                }
            });

            updateVisibility();

            // Highlight the selected preset card and show confirmation notice
            presetGrid.querySelectorAll('.r-preset-card').forEach(card => card.classList.remove('selected'));
            presetGrid.querySelector(`[data-preset-id="${preset.id}"]`)?.classList.add('selected');
            const label = find('rBG-preset-active-label');
            const name  = find('rBG-preset-active-name');
            if (label && name) { name.textContent = preset.name; label.style.display = 'block'; }
        }

        // Render a card for each preset in the grid
        PRESETS.forEach((preset, index) => {
            const card = document.createElement('div');
            card.className = 'r-preset-card';
            card.dataset.presetId = preset.id;
            card.style.animationDelay = `${index * 40}ms`;
            card.innerHTML = `
                <div class="r-preset-thumb" style="background:${preset.thumb}"></div>
                <div class="r-preset-name">${preset.name}</div>
            `;
            card.addEventListener('click', () => applyPreset(preset));
            presetGrid.appendChild(card);
        });


        // Gather all current UI values and write them to settings storage
        function collectAndSave() {
            const patch = {
                use_animated:        String(useAnimatedToggle.checked),
                video_url:           videoUrlInput.value.trim(),
                override_text_color: String(overrideTextToggle.checked),
                text_color:          textColorPicker.value,
                use_advanced:        String(useAdvancedToggle.checked),
            };
            // Collect all range sliders that have a data-setting attribute
            popup.querySelectorAll('.r-range[data-setting]').forEach(el => { patch[el.dataset.setting] = el.value; });
            if (scaleEl) patch.scale          = scaleEl.value;
            if (blendEl) patch.blend_mode     = blendEl.value;
            if (overlayColorPicker) patch.overlay_color = overlayColorPicker.value;
            if (useAdvancedToggle.checked) Object.assign(patch, readAdvancedValues());
            saveSettings(patch);
        }

        // Save button: collect, apply, and show a brief confirmation state
        saveButton.addEventListener('click', () => {
            collectAndSave();
            applycustombackgrounds();
            const original = saveButton.textContent;
            saveButton.textContent = '✓ Saved!';
            saveButton.style.background = 'linear-gradient(135deg,#3d7a5c,#1e4030)';
            setTimeout(() => {
                saveButton.textContent = original;
                saveButton.style.background = '';
            }, 1500);
        });

        // Clicking the backdrop closes the popup
        overlay.addEventListener('click', closePopup);


        // Reset button: show a confirmation dialog before wiping everything
        resetButton.addEventListener('click', () => {
            const confirmDialog = document.createElement('div');
            confirmDialog.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1e1e1e;border:1px solid #333;border-radius:11px;padding:24px;z-index:99999999;box-shadow:0 20px 50px rgba(0,0,0,.9);animation:rSlideIn .2s;min-width:300px;max-width:360px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;';
            confirmDialog.innerHTML = `
                <h3 style="margin:0 0 10px;color:#e0e0e0;font-size:15px;font-weight:600">⚠️ Reset everything?</h3>
                <p style="margin:0 0 20px;color:#999;font-size:12px;line-height:1.6">All settings will be restored to defaults and uploaded files will be deleted. This cannot be undone.</p>
                <div style="display:flex;gap:8px;justify-content:flex-end">
                    <button id="rBG-cancel-reset" class="r-btn r-btn-ghost">Cancel</button>
                    <button id="rBG-confirm-reset" style="padding:10px 20px;background:#5a2e2e;color:#ffaaaa;border:1px solid #6d3c3c;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;transition:background .15s">Reset All</button>
                </div>`;
            document.body.appendChild(confirmDialog);
            const cancelBtn  = confirmDialog.querySelector('#rBG-cancel-reset');
            const confirmBtn = confirmDialog.querySelector('#rBG-confirm-reset');
            cancelBtn.addEventListener('click', () => confirmDialog.remove());
            confirmBtn.addEventListener('mouseover', () => confirmBtn.style.background = '#6d3c3c');
            confirmBtn.addEventListener('mouseout',  () => confirmBtn.style.background = '#5a2e2e');
            confirmBtn.addEventListener('click', () => {
                resetSettings();
                deleteSavedFile('video');
                deleteSavedFile('image');
                confirmDialog.remove();
                location.reload();
            });
        });
    }


    /*******************************************************
    name of function: openGameQualitySettings
    description: opens game quality settings
    *******************************************************/
    function openGameQualitySettings() {
        if (document.getElementById('game-settings-modal')) return;

        // make the dark overlay thing
        const overlay = document.createElement('div');
        overlay.id = 'game-settings-modal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'modal-title');
        overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        opacity: 0;
        transition: opacity 0.2s ease;
    `;

        // the actual modal box
        const modal = document.createElement('div');
        modal.style.cssText = `
        background: #1a1a1a;
        border-radius: 16px;
        padding: 32px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        width: 480px;
        max-width: 90vw;
        max-height: 90vh;
        overflow-y: auto;
        transform: scale(0.95) translateY(20px);
        transition: all 0.2s ease;
        color: #ffffff;
        border: 1px solid #404040;
    `;

        const form = document.createElement('form');
        form.setAttribute('novalidate', '');

        // title text
        const title = document.createElement('h2');
        title.id = 'modal-title';
        title.textContent = 'Game Quality Settings';
        title.style.cssText = `
        margin: 0 0 24px 0;
        font-size: 24px;
        font-weight: 600;
        color: #e0e0e0;
        text-align: center;
        line-height: 1.3;
    `;

        // rating slider section
        const ratingSection = document.createElement('div');
        ratingSection.style.cssText = `
        margin-bottom: 32px;
        padding: 24px;
        background: #2a2a2a;
        border-radius: 10px;
        border: 1px solid #404040;
    `;

        const ratingFieldset = document.createElement('fieldset');
        ratingFieldset.style.cssText = `
        border: none;
        padding: 0;
        margin: 0;
    `;

        const ratingLegend = document.createElement('legend');
        ratingLegend.textContent = 'Game Rating Threshold';
        ratingLegend.style.cssText = `
        font-weight: 600;
        color: #e0e0e0;
        font-size: 16px;
        margin-bottom: 16px;
        padding: 0;
    `;

        const ratingContainer = document.createElement('div');
        ratingContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 16px;
    `;

        const ratingSlider = document.createElement('input');
        ratingSlider.type = 'range';
        ratingSlider.id = 'game-rating-slider';
        ratingSlider.name = 'gameRating';
        ratingSlider.min = '1';
        ratingSlider.max = '100';
        ratingSlider.step = '1';
        ratingSlider.value = localStorage.getItem('ROLOCATE_gamerating') || '75';
        ratingSlider.setAttribute('aria-label', 'Game rating threshold percentage');
        ratingSlider.style.cssText = `
        flex: 1;
        height: 6px;
        border-radius: 3px;
        background: #333333;
        outline: none;
        cursor: pointer;
        -webkit-appearance: none;
        appearance: none;
    `;

        // slider thumb styles
        const sliderStyles = document.createElement('style');
        sliderStyles.textContent = `
        #game-rating-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #166534;
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        #game-rating-slider::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #166534;
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        #game-rating-slider:focus::-webkit-slider-thumb {
            box-shadow: 0 0 0 3px rgba(22, 101, 52, 0.25);
        }
        #game-rating-slider:focus::-moz-range-thumb {
            box-shadow: 0 0 0 3px rgba(22, 101, 52, 0.25);
        }
    `;
        document.head.appendChild(sliderStyles);

        const ratingDisplay = document.createElement('div');
        ratingDisplay.style.cssText = `
        min-width: 60px;
        text-align: center;
        font-weight: 600;
        color: #cccccc;
        font-size: 16px;
    `;

        const ratingValue = document.createElement('span');
        ratingValue.id = 'rating-value';
        ratingValue.textContent = `${ratingSlider.value}%`;
        ratingValue.setAttribute('aria-live', 'polite');

        const ratingDescription = document.createElement('p');
        ratingDescription.style.cssText = `
        margin: 12px 0 0 0;
        font-size: 14px;
        color: #b0b0b0;
        line-height: 1.4;
    `;
        ratingDescription.textContent = 'Show games with ratings at or above this threshold';

        ratingSlider.addEventListener('input', function() {
            ratingValue.textContent = `${this.value}%`;
        });

        ratingDisplay.appendChild(ratingValue);
        ratingContainer.appendChild(ratingSlider);
        ratingContainer.appendChild(ratingDisplay);
        ratingFieldset.appendChild(ratingLegend);
        ratingFieldset.appendChild(ratingContainer);
        ratingFieldset.appendChild(ratingDescription);
        ratingSection.appendChild(ratingFieldset);

        // player count section
        const playerSection = document.createElement('div');
        playerSection.style.cssText = `
        margin-bottom: 32px;
        padding: 24px;
        background: #2a2a2a;
        border-radius: 10px;
        border: 1px solid #404040;
    `;

        const playerFieldset = document.createElement('fieldset');
        playerFieldset.style.cssText = `
        border: none;
        padding: 0;
        margin: 0;
    `;

        const playerLegend = document.createElement('legend');
        playerLegend.textContent = 'Player Count Range';
        playerLegend.style.cssText = `
        font-weight: 600;
        color: #e0e0e0;
        font-size: 16px;
        margin-bottom: 16px;
        padding: 0;
    `;

        const inputGrid = document.createElement('div');
        inputGrid.style.cssText = `
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 12px;
    `;

        // get existing player count or defaults
        const existingPlayerCount = localStorage.getItem('ROLOCATE_playercount');
        let minPlayerValue = '2500',
            maxPlayerValue = 'unlimited';

        if (existingPlayerCount) {
            try {
                const playerCountData = JSON.parse(existingPlayerCount);
                minPlayerValue = playerCountData.min || '2500';
                maxPlayerValue = playerCountData.max || 'unlimited';
            } catch (e) {
                ConsoleLogEnabled('Failed to parse player count data, using defaults');
            }
        }

        // function to create input containers
        function createInputContainer(labelText, inputType, inputId, inputName, inputValue, extraAttrs = {}) {
            const container = document.createElement('div');
            const label = document.createElement('label');
            label.textContent = labelText;
            label.setAttribute('for', inputId);
            label.style.cssText = `
            display: block;
            margin-bottom: 6px;
            font-weight: 500;
            color: #e0e0e0;
            font-size: 14px;
        `;

            const input = document.createElement('input');
            input.type = inputType;
            input.id = inputId;
            input.name = inputName;
            input.value = inputValue;
            input.setAttribute('aria-describedby', 'player-count-desc');
            input.style.cssText = `
            width: 100%;
            padding: 12px;
            background: #333333;
            border: 2px solid #555555;
            border-radius: 8px;
            color: #ffffff;
            font-size: 14px;
            transition: border-color 0.15s ease;
            outline: none;
            box-sizing: border-box;
        `;

            // add extra attributes
            Object.entries(extraAttrs).forEach(([key, value]) => {
                input.setAttribute(key, value);
            });

            container.appendChild(label);
            container.appendChild(input);
            return {
                container,
                input
            };
        }

        // min player input
        const minData = createInputContainer('Minimum Players', 'number', 'min-players', 'minPlayers', minPlayerValue, {
            min: '0',
            max: '1000000'
        });

        // max player input
        const maxData = createInputContainer('Maximum Players', 'text', 'max-players', 'maxPlayers', maxPlayerValue, {
            placeholder: 'Enter number or "unlimited"'
        });

        // fix max label color
        maxData.container.querySelector('label').style.color = '#495057';

        const playerDescription = document.createElement('p');
        playerDescription.id = 'player-count-desc';
        playerDescription.style.cssText = `
        margin: 0;
        font-size: 14px;
        color: #b0b0b0;
        line-height: 1.4;
    `;
        playerDescription.textContent = 'Filter games by active player count. Use "unlimited" for no upper limit.';

        // error message thing
        const errorContainer = document.createElement('div');
        errorContainer.style.cssText = `
        margin-top: 12px;
        padding: 8px 12px;
        background: #2a2a2a;
        color: #ff4757;
        border: 1px solid #ff6b6b;
        border-radius: 8px;
        font-size: 14px;
        display: none;
    `;

        // validation and focus effects for inputs
        [minData.input, maxData.input].forEach(input => {
            input.addEventListener('focus', function() {
                this.style.borderColor = '#166534';
                this.style.boxShadow = '0 0 0 3px rgba(22, 101, 52, 0.25)';
            });

            input.addEventListener('blur', function() {
                this.style.borderColor = '#555555';
                this.style.boxShadow = 'none';
                validateInputs();
            });

            input.addEventListener('input', validateInputs);
        });

        function validateInputs() {
            errorContainer.style.display = 'none';
            const minValue = parseInt(minData.input.value);
            const maxValue = maxData.input.value.toLowerCase() === 'unlimited' ? Infinity : parseInt(maxData.input.value);

            if (isNaN(minValue) || minValue < 0) {
                errorContainer.textContent = 'Minimum player count must be a valid number greater than or equal to 0.';
                errorContainer.style.display = 'block';
                return false;
            }
            if (maxData.input.value.toLowerCase() !== 'unlimited' && (isNaN(maxValue) || maxValue < 0)) {
                errorContainer.textContent = 'Maximum player count must be a valid number or "unlimited".';
                errorContainer.style.display = 'block';
                return false;
            }
            if (maxValue !== Infinity && minValue > maxValue) {
                errorContainer.textContent = 'Minimum player count cannot be greater than maximum player count.';
                errorContainer.style.display = 'block';
                return false;
            }
            return true;
        }

        inputGrid.appendChild(minData.container);
        inputGrid.appendChild(maxData.container);
        playerFieldset.appendChild(playerLegend);
        playerFieldset.appendChild(inputGrid);
        playerFieldset.appendChild(playerDescription);
        playerFieldset.appendChild(errorContainer);
        playerSection.appendChild(playerFieldset);

        // buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 32px;
    `;

        // helper for button creation
        function createButton(text, type, bgColor, borderColor, hoverBg, hoverBorder) {
            const button = document.createElement('button');
            button.type = type;
            button.textContent = text;
            button.style.cssText = `
            padding: 12px 24px;
            background: ${bgColor};
            color: ${type === 'submit' ? 'white' : '#cccccc'};
            border: 2px solid ${borderColor};
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.15s ease;
            outline: none;
        `;

            button.addEventListener('mouseenter', function() {
                this.style.backgroundColor = hoverBg;
                this.style.borderColor = hoverBorder;
            });

            button.addEventListener('mouseleave', function() {
                this.style.backgroundColor = bgColor;
                this.style.borderColor = borderColor;
            });

            button.addEventListener('focus', function() {
                this.style.boxShadow = type === 'submit' ? '0 0 0 3px rgba(22, 101, 52, 0.25)' : '0 0 0 3px rgba(108, 117, 125, 0.25)';
            });

            button.addEventListener('blur', function() {
                this.style.boxShadow = 'none';
            });

            return button;
        }

        const cancelButton = createButton('Cancel', 'button', '#333333', '#555555', '#404040', '#666666');
        const saveButton = createButton('Save Settings', 'submit', '#166534', '#166534', '#14532d', '#14532d');

        // form submit handler
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            if (!validateInputs()) return;

            try {
                const playerCountData = {
                    min: minData.input.value,
                    max: maxData.input.value
                };

                localStorage.setItem('ROLOCATE_gamerating', ratingSlider.value);
                localStorage.setItem('ROLOCATE_playercount', JSON.stringify(playerCountData));
                closeModal();
            } catch (error) {
                ConsoleLogEnabled('Failed to save settings:', error);
                errorContainer.textContent = 'Failed to save settings. Please try again.';
                errorContainer.style.display = 'block';
            }
        });

        cancelButton.addEventListener('click', closeModal);

        // close modal with animation
        function closeModal() {
            modal.style.transform = 'scale(0.95) translateY(20px)';
            overlay.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(overlay)) document.body.removeChild(overlay);
                if (document.head.contains(sliderStyles)) document.head.removeChild(sliderStyles);
            }, 200);
        }

        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(saveButton);

        // put it all together
        form.appendChild(title);
        form.appendChild(ratingSection);
        form.appendChild(playerSection);
        form.appendChild(buttonContainer);
        modal.appendChild(form);
        overlay.appendChild(modal);

        document.body.appendChild(overlay);

        // show modal with animation
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            modal.style.transform = 'scale(1) translateY(0)';
        });

        // focus first input
        setTimeout(() => ratingSlider.focus(), 250);
    }



    function qualityfilterRobloxGames() {

        // exit if on home page or filter disabled
        if (/^https?:\/\/(www\.)?roblox\.com(\/[a-z]{2})?\/home\/?$/i.test(window.location.href)) {
            ConsoleLogEnabled("On roblox.com/home. Gamequalityfilter Exiting function.");
            return;
        }
        if (localStorage.ROLOCATE_gamequalityfilter !== "true") return;
        if (window.robloxGameFilterObserver) window.robloxGameFilterObserver.disconnect();

        const seenCards = new WeakSet();

        function parsePlayerCount(text) {
            if (!text) return 0;
            const clean = text.replace(/[,\s]/g, '').toLowerCase();
            const multiplier = clean.includes('k') ? 1000 : clean.includes('m') ? 1000000 : 1;
            const number = parseFloat(clean.replace(/[km]/, ''));
            return isNaN(number) ? 0 : number * multiplier;
        }

        function getFilterSettings() {
            return {
                rating: parseInt(localStorage.getItem('ROLOCATE_gamerating') || '80'),
                playerCount: (() => {
                    const data = JSON.parse(localStorage.getItem('ROLOCATE_playercount') || '{"min":"5000","max":"unlimited"}');
                    return {
                        min: parseInt(data.min),
                        max: data.max === 'unlimited' ? Infinity : parseInt(data.max)
                    };
                })()
            };
        }

        function filterCard(card, settings) {
            if (seenCards.has(card)) return;
            seenCards.add(card);

            let rating = 0;
            const ratingSelectors = [
                '.vote-percentage-label',
                '[data-testid="game-tile-stats-rating"] .vote-percentage-label',
                '.game-card-info .vote-percentage-label',
                '.base-metadata .vote-percentage-label'
            ];
            for (const sel of ratingSelectors) {
                const el = card.querySelector(sel);
                if (el) {
                    const match = el.textContent.match(/(\d+)%/);
                    if (match) {
                        rating = parseInt(match[1]);
                        break;
                    }
                }
            }

            let playerCount = 0;
            let hasPlayerCount = false;
            const pcEl = card.querySelector('.playing-counts-label');
            if (pcEl) {
                playerCount = parsePlayerCount(pcEl.textContent);
                hasPlayerCount = true;
            }

            const shouldShow = (
                rating >= settings.rating &&
                (!hasPlayerCount || (playerCount >= settings.playerCount.min && playerCount <= settings.playerCount.max))
            );

            card.style.display = shouldShow ? '' : 'none';
        }

        function filterAllCards() {
            const settings = getFilterSettings();

            const cards = document.querySelectorAll(`
            li.game-card,
            li[data-testid="wide-game-tile"],
            .grid-item-container.game-card-container
        `);
            cards.forEach(card => filterCard(card, settings));
        }

        // run filtering every second to pick up new cards and setting changes
        // plz no memoryt leak
        const intervalId = setInterval(() => {
            try {
                filterAllCards();
            } catch (err) {
                ConsoleLogEnabled('[ROLOCATE] Filter error:', err);
            }
        }, 1000);

        const observer = new MutationObserver(() => {
            filterAllCards();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /***************************************************************
     *  name of function: showOldRobloxGreeting
     *  description: shows old roblox greeting if setting is turned on
     ****************************************************************/
    async function showOldRobloxGreeting() {
        // guards
        if (!/^https?:\/\/(www\.)?roblox\.com(\/[a-z]{2})?\/home\/?$/i.test(window.location.href)) return;
        if (localStorage.getItem("ROLOCATE_ShowOldGreeting") !== "true") return;

        // waits for the dom
        const make = (tag, cls = '', props = {}) =>
            Object.assign(document.createElement(tag), cls ? { className: cls, ...props } : props);

        // the two features
        const FEATURES_KEY = "ROLOCATE_showoldgreeting_features";
        const FEATURE_DEFS = {
            showRoProMostPlayed: { label: "Show RoPro Most Played", default: true  },
            featureTwo:          { label: "Weekly Playtime",         default: false },
        };

        // loads from localstoaeg
        const loadFeatures = () => {
            try {
                const stored = JSON.parse(localStorage.getItem(FEATURES_KEY) || "{}");
                const defaults = Object.fromEntries(
                    Object.entries(FEATURE_DEFS).map(([key, meta]) => [key, key in stored ? stored[key] : meta.default])
                );
                return { ...stored, ...defaults };
            } catch {
                return Object.fromEntries(Object.entries(FEATURE_DEFS).map(([key, meta]) => [key, meta.default]));
            }
        };
        const saveFeatures = feat => localStorage.setItem(FEATURES_KEY, JSON.stringify(feat));

        // again dom helpers
        const waitForEl = selector => new Promise(resolve => {
            const found = document.querySelector(selector);
            if (found) return resolve(found);
            const obs = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) { obs.disconnect(); resolve(el); }
            });
            obs.observe(document.body, { childList: true, subtree: true });
        });

        // gets avatar
        const fetchAvatar = async (selector, fallback) => {
            const selectors = [
                selector,
                ".age-bracket-label .avatar-card-image img",
                ".avatar.avatar-headshot-xs .thumbnail-2d-container.avatar-card-image img",
            ];
            for (let i = 0; i < 3; i++) {
                for (const sel of selectors) {
                    const img = document.querySelector(sel);
                    if (img?.src && img.src !== fallback) return img.src;
                }
                await new Promise(res => setTimeout(res, 1500));
            }
            return fallback;
        };

        const timeGreeting = name => {
            const hour = new Date().getHours();
            if (hour < 12) return `Morning, ${name}!`;
            if (hour < 18) return `Afternoon, ${name}!`;
            return `Evening, ${name}!`;
        };

        // privacy
        const PERM = {
            AllUsers: 4, All: 4,
            FriendsFollowingAndFollowers: 3, Followers: 3,
            FriendsAndFollowing: 2, Following: 2,
            Friends: 1, NoOne: 0,
        };

        const ONLINE_TO_JOIN = {
            AllUsers: 'All', FriendsFollowingAndFollowers: 'Followers',
            FriendsAndFollowing: 'Following', Friends: 'Friends', NoOne: 'NoOne',
        };

        const ONLINE_OPTS = [
            { label: 'Everyone',                       value: 'AllUsers' },
            { label: 'Friends, Following & Followers', value: 'FriendsFollowingAndFollowers' },
            { label: 'Friends & Following',            value: 'FriendsAndFollowing' },
            { label: 'Friends',                        value: 'Friends' },
            { label: 'No One',                         value: 'NoOne' },
        ];
        const JOIN_OPTS = [
            { label: 'Everyone',                       value: 'All' },
            { label: 'Friends, Following & Followers', value: 'Followers' },
            { label: 'Friends & Following',            value: 'Following' },
            { label: 'Friends',                        value: 'Friends' },
            { label: 'No One',                         value: 'NoOne' },
        ];

        const gmFetch = (url, opts = {}) => new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: opts.method || 'GET',
                url,
                headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(opts.headers || {}) },
                data: opts.body ? JSON.stringify(opts.body) : undefined,
                onload: res => {
                    if (res.status >= 200 && res.status < 300) {
                        try { resolve(JSON.parse(res.responseText)); } catch { resolve({}); }
                    } else {
                        reject(new Error(`HTTP ${res.status}`));
                    }
                },
                onerror: err => reject(err),
            });
        });

        const postPrivacy = async (key, val) => {
            const csrf = await getCsrfToken();
            if (!csrf) { ConsoleLogEnabled(`Privacy update error: could not get CSRF token`); return; }
            gmFetch('https://apis.roblox.com/user-settings-api/v1/user-settings', {
                method: 'POST',
                headers: { 'x-csrf-token': csrf },
                body: { [key]: val },
            }).catch(err => ConsoleLogEnabled(`Privacy update error: ${err.message}`));
        };

        // fetch current privacy on page load
        let curOnline = 'AllUsers', curJoin = 'All';
        try {
            const data = await gmFetch('https://apis.roblox.com/user-settings-api/v1/user-settings/settings-and-options');
            curOnline = data.whoCanSeeMyOnlineStatus?.currentValue   ?? 'AllUsers';
            curJoin   = data.whoCanJoinMeInExperiences?.currentValue ?? 'All';
        } catch (err) {
            ConsoleLogEnabled(`Privacy fetch error: ${err.message}`);
        }

        const dotColor = () => {
            if (curOnline === 'NoOne') return '#6b7280';
            return '#22c55e';
        };

        // styles
        const injectStyles = dark => {
            if (document.getElementById("rolocate-greeting-styles")) return;
            const style = make('style', '', { id: "rolocate-greeting-styles" });
            style.textContent = `
                .rolocate-greeting-header {
                    display: flex; align-items: center; gap: 25px;
                    margin-bottom: 16px; padding: 30px; min-height: 180px;
                    background: ${dark ? "#1a1c23" : "#E0D8CC"};
                    border-radius: 12px;
                    border: 1px solid ${dark ? "#2a2a30" : "#C1B19A"};
                    position: relative;
                }
                .rolocate-profile-wrap {
                    position: relative; flex-shrink: 0;
                    width: 140px; height: 140px;
                }
                .rolocate-profile-frame {
                    width: 100%; height: 100%; overflow: hidden;
                    border: 3px solid ${dark ? "#2a2a30" : "#C1B19A"};
                    transition: border-color 0.3s;
                    box-sizing: border-box;
                }
                .rolocate-profile-frame.rounded { border-radius: 50%; }
                .rolocate-profile-img { width: 100%; height: 100%; object-fit: cover; }
                .rolocate-user-name {
                    font-size: 2em; font-weight: 600; margin: 0;
                    color: ${dark ? "#fff" : "#000"};
                    font-family: "Segoe UI", Roboto, sans-serif;
                }
                .rolocate-most-played-wrapper {
                    margin-left: auto; flex-shrink: 0;
                    width: 520px; height: 205px;
                    overflow: hidden;
                    position: relative;
                }
                .rolocate-most-played-wrapper > div { float: none !important; margin: 0 !important; position: static !important; }
                .rolocate-settings-btn {
                    position: absolute; top: 6px; right: 6px;
                    background: transparent; border: 1.5px solid #3b82f6;
                    color: #3b82f6; cursor: pointer;
                    font-size: 13px; font-weight: 600;
                    padding: 5px 13px; border-radius: 8px;
                    font-family: "Segoe UI", Roboto, sans-serif;
                    display: flex; align-items: center; gap: 6px;
                    transition: background 0.15s;
                }
                .rolocate-settings-btn:hover { background: rgba(37,99,235,0.08); }
                @keyframes rolocate-fade-in  { from{opacity:0} to{opacity:1} }
                @keyframes rolocate-fade-out { from{opacity:1} to{opacity:0} }
                @keyframes rolocate-popup-in  { from{opacity:0;transform:scale(.93) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
                @keyframes rolocate-popup-out { from{opacity:1;transform:scale(1) translateY(0)} to{opacity:0;transform:scale(.93) translateY(8px)} }
                @keyframes rolocate-dot-ping {
                    0%   { box-shadow: 0 0 0 0   rgba(34,197,94,0.6); }
                    70%  { box-shadow: 0 0 0 8px rgba(34,197,94,0);   }
                    100% { box-shadow: 0 0 0 0   rgba(34,197,94,0);   }
                }
                .rolocate-popup-overlay {
                    position: fixed; inset: 0; z-index: 99998;
                    background: rgba(0,0,0,.45);
                    display: flex; align-items: center; justify-content: center;
                    animation: rolocate-fade-in 0.18s ease forwards;
                }
                .rolocate-popup-overlay.closing { animation: rolocate-fade-out 0.18s ease forwards; }
                .rolocate-popup-overlay.closing .rolocate-popup { animation: rolocate-popup-out 0.18s ease forwards; }
                .rolocate-popup {
                    background: ${dark ? "#1a1c23" : "#f5f0e8"};
                    border: 1px solid ${dark ? "#2a2a30" : "#C1B19A"};
                    border-radius: 14px; padding: 24px 28px; width: 320px; z-index: 99999;
                    font-family: "Segoe UI", Roboto, sans-serif;
                    box-shadow: 0 8px 32px rgba(0,0,0,.35);
                    animation: rolocate-popup-in 0.18s ease forwards;
                }
                .rolocate-popup h2 { margin: 0 0 6px; font-size: 1.1em; font-weight: 700; color: ${dark ? "#fff" : "#333"}; }
                .rolocate-popup-sub { margin: 0 0 18px; font-size: .78em; color: ${dark ? "#888" : "#999"}; }
                .rolocate-toggle-row {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 9px 0; border-bottom: 1px solid ${dark ? "#2a2a30" : "#ddd3c3"};
                }
                .rolocate-toggle-row:last-of-type { border-bottom: none; }
                .rolocate-toggle-label { font-size: .9em; color: ${dark ? "#ddd" : "#444"}; }
                .rolocate-toggle { position: relative; width: 38px; height: 22px; flex-shrink: 0; }
                .rolocate-toggle input { opacity: 0; width: 0; height: 0; }
                .rolocate-toggle-track {
                    position: absolute; inset: 0;
                    background: ${dark ? "#3a3a42" : "#ccc"};
                    border-radius: 22px; cursor: pointer; transition: background .2s;
                }
                .rolocate-toggle input:checked + .rolocate-toggle-track { background: #16a34a; }
                .rolocate-toggle-track::after {
                    content: ""; position: absolute; left: 3px; top: 3px;
                    width: 16px; height: 16px; border-radius: 50%;
                    background: #fff; transition: transform .2s;
                }
                .rolocate-toggle input:checked + .rolocate-toggle-track::after { transform: translateX(16px); }
                .rolocate-popup-close {
                    margin-top: 18px; width: 100%; padding: 8px; border: none;
                    border-radius: 8px; cursor: pointer; font-size: .9em;
                    background: ${dark ? "#2a2a30" : "#C1B19A"};
                    color: ${dark ? "#fff" : "#333"};
                    transition: opacity .15s;
                }
                .rolocate-popup-close:hover { opacity: .8; }
                .rolocate-popup-watermark {
                    margin-top: 14px; text-align: center;
                    font-size: .72em; letter-spacing: .03em;
                    color: ${dark ? "#444" : "#bbb"};
                    font-family: "Segoe UI", Roboto, sans-serif;
                }
                .rolocate-toggle-row.disabled .rolocate-toggle-label { color: ${dark ? "#555" : "#bbb"}; }
                .rolocate-toggle-row.disabled .rolocate-toggle-track { opacity: .35; cursor: not-allowed; }
                .rolocate-toggle-row.disabled input { pointer-events: none; }
                .rolocate-weekly-playtime {
                    margin-left: auto; flex-shrink: 0;
                    display: flex; flex-direction: column; justify-content: center;
                }
                .rolocate-weekly-playtime h3 {
                    font-size: 1em; font-weight: 700; margin: 0 0 10px;
                    color: ${dark ? "#fff" : "#333"};
                    font-family: "Segoe UI", Roboto, sans-serif;
                }
                .rolocate-playtime-cards { display: flex; flex-wrap: wrap; gap: 10px; }
                .rolocate-game-card {
                    display: flex; flex-direction: column; align-items: center;
                    width: 90px; cursor: pointer; text-decoration: none;
                    border-radius: 10px; padding: 8px 6px 6px;
                    background: ${dark ? "#24262e" : "#f0e9dd"};
                    border: 1px solid ${dark ? "#2a2a30" : "#C1B19A"};
                    transition: transform 0.15s, box-shadow 0.15s;
                }
                .rolocate-game-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 4px 14px rgba(0,0,0,0.25);
                }
                .rolocate-game-card img { width: 70px; height: 70px; border-radius: 8px; object-fit: cover; }
                .rolocate-game-card-name {
                    margin-top: 6px; font-size: 0.72em; text-align: center;
                    color: ${dark ? "#ddd" : "#333"};
                    font-family: "Segoe UI", Roboto, sans-serif;
                    font-weight: 600;
                    max-width: 80px;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .rolocate-game-card-time {
                    margin-top: 3px; font-size: 0.68em; text-align: center;
                    color: ${dark ? "#888" : "#888"};
                    font-family: "Segoe UI", Roboto, sans-serif;
                }
                .rolocate-status-dot {
                    position: absolute;
                    bottom: 4px; right: 4px;
                    width: 22px; height: 22px;
                    border-radius: 50%;
                    border: 3.5px solid ${dark ? "#1a1c23" : "#E0D8CC"};
                    cursor: pointer; z-index: 2;
                    transition: transform 0.18s, background 0.25s;
                    box-shadow: 0 1px 5px rgba(0,0,0,0.45);
                }
                .rolocate-status-dot:hover { transform: scale(1.25); }
                .rolocate-status-dot.ping  { animation: rolocate-dot-ping 0.55s ease-out; }
                .rolocate-click-me {
                    position: absolute;
                    bottom: 8px; right: -72px;
                    display: flex; align-items: center; gap: 3px;
                    font-family: "Segoe UI", Roboto, sans-serif;
                    font-size: 0.7em; font-weight: 700;
                    color: #3b82f6;
                    white-space: nowrap;
                    pointer-events: none;
                    animation: rolocate-fade-in 0.4s ease forwards;
                }
                .rolocate-click-me-dismiss {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    color: #3b82f6;
                    font-size: 0.85em;
                    font-weight: 700;
                    line-height: 1;
                    padding: 0 0 0 3px;
                    pointer-events: all;
                    opacity: 0.7;
                    transition: opacity 0.15s;
                }
                .rolocate-click-me-dismiss:hover { opacity: 1; }
                .rolocate-status-panel {
                    position: absolute; z-index: 99999;
                    background: ${dark ? "#1a1c23" : "#f5f0e8"};
                    border: 1px solid ${dark ? "#2a2a30" : "#C1B19A"};
                    border-radius: 12px; padding: 14px 12px 10px;
                    width: 235px;
                    box-shadow: 0 8px 28px rgba(0,0,0,0.35);
                    font-family: "Segoe UI", Roboto, sans-serif;
                    animation: rolocate-popup-in 0.16s ease forwards;
                }
                .rolocate-status-section-label {
                    font-size: 0.67em; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 0.07em;
                    color: ${dark ? "#666" : "#aaa"};
                    margin: 0 0 3px 4px;
                }
                .rolocate-status-section + .rolocate-status-section { margin-top: 8px; }
                .rolocate-status-opt {
                    display: flex; align-items: center; gap: 7px;
                    padding: 5px 8px; border-radius: 7px;
                    cursor: pointer; font-size: 0.82em;
                    color: ${dark ? "#ccc" : "#444"};
                    border: none; background: transparent;
                    width: 100%; text-align: left;
                    transition: background 0.12s;
                    font-family: "Segoe UI", Roboto, sans-serif;
                }
                .rolocate-status-opt:hover:not(:disabled) {
                    background: ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"};
                }
                .rolocate-status-opt.active { color: #3b82f6; font-weight: 600; }
                .rolocate-status-opt:disabled { opacity: 0.28; cursor: not-allowed; }
                .rolocate-status-opt-check {
                    width: 13px; height: 13px; flex-shrink: 0;
                    font-size: 11px; color: #3b82f6;
                    visibility: hidden;
                    display: flex; align-items: center; justify-content: center;
                }
                .rolocate-status-opt.active .rolocate-status-opt-check { visibility: visible; }
                .rolocate-status-divider {
                    border: none;
                    border-top: 1px solid ${dark ? "#2a2a30" : "#ddd3c3"};
                    margin: 8px 0;
                }
            `;
            document.head.appendChild(style);
        };

        // greeting header build
        const buildHeader = (greeting, avatarSrc, features) => {
            const header = make('div', 'rolocate-greeting-header');

            const settingsBtn = make('button', 'rolocate-settings-btn', { innerHTML: `<span>⚙</span><span>Customize</span>` });
            header.appendChild(settingsBtn);

            const wrap  = make('div', 'rolocate-profile-wrap');
            const frame = make('div', 'rolocate-profile-frame rounded');
            frame.style.borderColor = dotColor();
            frame.appendChild(make('img', 'rolocate-profile-img', { src: avatarSrc }));
            wrap.appendChild(frame);

            const dot = make('div', 'rolocate-status-dot');
            dot.style.background = dotColor();
            dot.title = "Click to manage Online Status & Join Privacy";
            wrap.appendChild(dot);

            if (!features.clickMeDismissed) {
                const clickMe = make('div', 'rolocate-click-me');
                const label = make('span', '', { textContent: '⮜ Click me!' });
                const dismissBtn = make('button', 'rolocate-click-me-dismiss', { textContent: '✕' });
                dismissBtn.title = "Don't show again";
                dismissBtn.addEventListener('click', evt => {
                    evt.stopPropagation();
                    features.clickMeDismissed = true;
                    saveFeatures(features);
                    clickMe.remove();
                });
                clickMe.append(label, dismissBtn);
                wrap.appendChild(clickMe);
            }

            header.appendChild(wrap);

            const details = make('div');
            details.appendChild(make('h1', 'rolocate-user-name', { textContent: greeting }));
            header.appendChild(details);

            return { header, settingsBtn, frame, dot };
        };

        // Status panel builder
        const buildStatusPanel = (dark, frame, dot) => {
            const panel = make('div', 'rolocate-status-panel');

            const makeSection = (sectionLabel, opts, curVal, isOnline) => {
                const sec = make('div', 'rolocate-status-section');
                sec.appendChild(make('div', 'rolocate-status-section-label', { textContent: sectionLabel }));

                for (const opt of opts) {
                    const isActive   = opt.value === curVal;
                    const isDisabled = !isOnline && PERM[opt.value] > PERM[curOnline];

                    const btn = make('button', 'rolocate-status-opt' + (isActive ? ' active' : ''));
                    if (isDisabled) btn.disabled = true;

                    btn.append(
                        make('span', 'rolocate-status-opt-check', { textContent: '✓' }),
                        make('span', '', { textContent: opt.label })
                    );

                    btn.addEventListener('click', () => {
                        if (isOnline) {
                            curOnline = opt.value;
                            postPrivacy('whoCanSeeMyOnlineStatus', curOnline);
                            if (PERM[curJoin] > PERM[curOnline]) {
                                curJoin = ONLINE_TO_JOIN[curOnline];
                                postPrivacy('whoCanJoinMeInExperiences', curJoin);
                            }
                            const lbl = ONLINE_OPTS.find(o => o.value === curOnline)?.label ?? curOnline;
                            notifications(`Saved! Only "${lbl}" will see you online.`, 'success', '', '5000');
                        } else {
                            if (PERM[opt.value] > PERM[curOnline]) return;
                            curJoin = opt.value;
                            postPrivacy('whoCanJoinMeInExperiences', curJoin);
                            const lbl = JOIN_OPTS.find(o => o.value === curJoin)?.label ?? curJoin;
                            notifications(`Saved! Only "${lbl}" can join you in experiences.`, 'success', '', '5000');
                        }

                        const col = dotColor();
                        dot.style.background    = col;
                        frame.style.borderColor = col;
                        dot.classList.remove('ping');
                        void dot.offsetWidth;
                        dot.classList.add('ping');
                        render();
                    });

                    sec.appendChild(btn);
                }
                return sec;
            };

            const render = () => {
                panel.innerHTML = '';
                panel.appendChild(makeSection('Online Status', ONLINE_OPTS, curOnline, true));
                panel.appendChild(make('hr', 'rolocate-status-divider'));
                panel.appendChild(makeSection('Who Can Join You In Games', JOIN_OPTS, curJoin, false));
            };

            render();
            return panel;
        };

        // the settings popup buiulder
        const buildPopup = dark => {
            const overlay = make('div', 'rolocate-popup-overlay');
            const popup   = make('div', 'rolocate-popup');

            popup.append(
                make('h2', '', { textContent: 'Show Old Greeting Settings' }),
                make('p', 'rolocate-popup-sub', { textContent: 'Changes apply on next page load.' })
            );

            const features = loadFeatures();
            const inputs   = {};

            for (const [key, meta] of Object.entries(FEATURE_DEFS)) {
                const disabled  = meta.disabled?.() ?? false;
                const row       = make('div', 'rolocate-toggle-row' + (disabled ? ' disabled' : ''));
                const lbl       = make('span', 'rolocate-toggle-label', { textContent: disabled ? `${meta.label} (None)` : meta.label });
                const toggleWrap = make('label', 'rolocate-toggle');
                const input     = make('input', '', { type: 'checkbox', checked: !disabled && features[key] });
                const track     = make('span', 'rolocate-toggle-track');

                if (disabled) input.disabled = true;

                input.addEventListener('change', () => {
                    if (input.checked) {
                        Object.entries(inputs).forEach(([otherKey, inp]) => {
                            if (otherKey !== key && inp.checked) { inp.checked = false; features[otherKey] = false; }
                        });
                    }
                    features[key] = input.checked;
                    saveFeatures(features);
                });

                toggleWrap.append(input, track);
                row.append(lbl, toggleWrap);
                popup.appendChild(row);
                inputs[key] = input;
            }

            popup.append(
                make('button', 'rolocate-popup-close', { textContent: 'Done' }),
                make('div', 'rolocate-popup-watermark', { textContent: 'RoLocate by Oqarshi' })
            );
            overlay.appendChild(popup);

            return { overlay, closeBtn: popup.querySelector('.rolocate-popup-close') };
        };

        // basically the main place it does it
        try {
            await new Promise(res => setTimeout(res, 500));

            const homeContainer = await waitForEl("#HomeContainer .section:first-child");
            const userNameEl    = document.querySelector("#navigation.rbx-left-col > ul > li > a .font-header-2");
            const username      = userNameEl?.innerText ?? "Robloxian";
            const avatarSrc     = await fetchAvatar(
                "#navigation.rbx-left-col > ul > li > a img",
                window.Base64Images?.image_place_holder ?? "https://www.roblox.com/Thumbs/Asset.ashx?width=100&height=100&assetId=0"
            );

            const features = loadFeatures();
            const dark     = isDarkMode();

            injectStyles(dark);
            const { header, settingsBtn, frame, dot } = buildHeader(timeGreeting(username), avatarSrc, features);
            homeContainer.replaceWith(header);

            // status dot → privacy panel
            dot.addEventListener('click', evt => {
                evt.stopPropagation();
                const existing = document.querySelector('.rolocate-status-panel');
                if (existing) { existing.remove(); return; }

                const panel = buildStatusPanel(dark, frame, dot);
                document.body.appendChild(panel);

                const rect = dot.getBoundingClientRect();
                panel.style.top  = `${rect.bottom + window.scrollY + 6}px`;
                panel.style.left = `${Math.max(8, Math.min(rect.left + window.scrollX, window.innerWidth - 235 - 8))}px`;

                setTimeout(() => {
                    const closePanel = ev => {
                        if (!panel.contains(ev.target) && ev.target !== dot) {
                            panel.remove();
                            document.removeEventListener('click', closePanel);
                        }
                    };
                    document.addEventListener('click', closePanel);
                }, 0);
            });

            // feature: ropro most played
            {
                FEATURE_DEFS.showRoProMostPlayed.disabled = () => false;

                if (features.showRoProMostPlayed) {
                    const roProEl = await new Promise(resolve => {
                        const existing = document.querySelector('#mostPlayedContainer');
                        if (existing) return resolve(existing);
                        let tries = 0;
                        const obs = new MutationObserver(() => {
                            const found = document.querySelector('#mostPlayedContainer');
                            if (found || ++tries > 40) { obs.disconnect(); resolve(found ?? null); }
                        });
                        obs.observe(document.body, { childList: true, subtree: true });
                        setTimeout(() => { obs.disconnect(); resolve(null); }, 750);
                    });

                    FEATURE_DEFS.showRoProMostPlayed.disabled = () => !roProEl;

                    if (roProEl) {
                        const widget =
                            roProEl.closest("div[style*='width:520px']")   ||
                            roProEl.closest("div[style*='width: 520px']")  ||
                            roProEl.closest("div[style*='height:205px']")  ||
                            roProEl.closest("div[style*='height: 205px']") ||
                            roProEl.parentElement;

                        widget.style.cssText += ";width:100%!important;height:205px!important;margin:0!important;position:relative!important;float:none!important;min-width:0!important;display:block!important;";

                        widget.querySelectorAll('.scroller').forEach(arrow => {
                            arrow.style.cssText += ";position:absolute!important;top:50%!important;transform:translateY(-50%)!important;margin:0!important;z-index:2;";
                        });
                        const leftArrow  = widget.querySelector('.scroller.prev');
                        const rightArrow = widget.querySelector('.scroller.next');
                        if (leftArrow)  leftArrow.style.left   = "0px";
                        if (rightArrow) rightArrow.style.right = "0px";

                        const cardsList = widget.querySelector('#mostPlayedContainer');
                        if (cardsList) cardsList.style.cssText += ";padding-left:34px!important;padding-right:34px!important;box-sizing:border-box!important;";

                        const wrapper = make('div', 'rolocate-most-played-wrapper');
                        wrapper.appendChild(widget);
                        header.appendChild(wrapper);
                    }
                } else {
                    const removeWidget = () => {
                        document.querySelectorAll('h3').forEach(heading => {
                            if (heading.textContent.trim() === 'Your Most Played')
                                heading.closest("div[style*='width:520px']")?.remove();
                        });
                    };
                    removeWidget();
                    new MutationObserver(removeWidget).observe(document.body, { childList: true, subtree: true });
                }
            }

            // feature: weekly playtime
            if (features.featureTwo) {
                try {
                    const screentimeData = await gmFetch('https://apis.roblox.com/parental-controls-api/v1/parental-controls/get-top-weekly-screentime-by-universe');
                    const entries = screentimeData?.universeWeeklyScreentimes;
                    if (!Array.isArray(entries) || entries.length === 0) return;

                    const gameDetails = await gmFetch(`https://games.roblox.com/v1/games?universeIds=${entries.map(entry => entry.universeId).join(',')}`);

                    const gameMap = {};
                    for (const game of (gameDetails?.data ?? [])) {
                        gameMap[game.id] = { name: game.name, placeId: game.rootPlaceId };
                    }

                    const iconMap = {};
                    await Promise.all(entries.map(async entry => {
                        try { iconMap[entry.universeId] = await getGameIconFromUniverseId(entry.universeId); }
                        catch { iconMap[entry.universeId] = null; }
                    }));

                    const formatMinutes = mins => {
                        if (mins < 60) return `${mins}m`;
                        const hours = Math.floor(mins / 60);
                        const rem   = mins % 60;
                        return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
                    };

                    const dateOpts = { month: 'short', day: 'numeric' };
                    const section  = make('div', 'rolocate-weekly-playtime');
                    const cardsRow = make('div', 'rolocate-playtime-cards');

                    section.append(
                        make('h3', '', {
                            textContent: `This Week's Playtime (${new Date(Date.now() - 6 * 864e5).toLocaleDateString('en-US', dateOpts)} – ${new Date().toLocaleDateString('en-US', dateOpts)})`,
                        }),
                        cardsRow
                    );

                    for (const entry of entries) {
                        const game = gameMap[entry.universeId];
                        if (!game) continue;

                        const card = make('a', 'rolocate-game-card', {
                            href: `https://www.roblox.com/games/${game.placeId}`, target: '_self',
                        });
                        card.append(
                            make('img', '', { src: iconMap[entry.universeId] ?? 'https://www.roblox.com/Thumbs/Asset.ashx?width=100&height=100&assetId=0', alt: game.name }),
                            make('div', 'rolocate-game-card-name', { textContent: game.name, title: game.name }),
                            make('div', 'rolocate-game-card-time', { textContent: formatMinutes(entry.weeklyMinutes) })
                        );
                        cardsRow.appendChild(card);
                    }

                    header.appendChild(section);
                } catch (err) {
                    ConsoleLogEnabled(`Weekly Playtime error (${err.message.includes('Screentime') ? 'Screentime API' : 'Games API'}): ${err.message}`);
                }
            }

            // settings popup
            const closeOverlay = overlay => {
                overlay.classList.add('closing');
                overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
            };
            settingsBtn.addEventListener('click', () => {
                if (document.querySelector('.rolocate-popup-overlay')) return;
                const { overlay, closeBtn } = buildPopup(dark);
                closeBtn.addEventListener('click', () => {
                    closeOverlay(overlay);
                    notifications('Settings Saved!', 'success', '', '3000');
                });
                document.body.appendChild(overlay);
            });

        } catch (err) {
            ConsoleLogEnabled(`showOldRobloxGreeting error: ${err.message}`);
        }
    }
    /*******************************************************
    name of function: observeURLChanges
    description: observes url changes for the old old greeting,
    quality game filter, and betterfriends
    *******************************************************/
    function observeURLChanges() {
        // dont run this twice
        if (window.urlObserverActive) return;
        window.urlObserverActive = true;

        let lastUrl = window.location.href.split("#")[0];

        const checkUrl = () => {
            const currentUrl = window.location.href.split("#")[0];
            if (currentUrl !== lastUrl) {
                ConsoleLogEnabled(`URL changed from ${lastUrl} to ${currentUrl}`);
                lastUrl = currentUrl;

                // if we go back to home page do the stuff
                if (/roblox\.com(\/[a-z]{2})?\/home/.test(currentUrl)) {
                    ConsoleLogEnabled("back on home page");
                    betterfriends();
                    quicklaunchgamesfunction();
                    showOldRobloxGreeting();
                }


                // if on games or discover pages do gamequalityfilter
                if (/roblox\.com(\/[a-z]{2})?\/(games(\/.*)?|discover(\/.*)?)\/?$/.test(currentUrl)) {
                    ConsoleLogEnabled("on games or discover page");
                    qualityfilterRobloxGames();
                }
            }
        };

        // hook into history changes if not already done
        if (!window.historyIntercepted) {
            const interceptHistoryMethod = (method) => {
                const original = history[method];
                history[method] = function(...args) {
                    const result = original.apply(this, args);
                    setTimeout(checkUrl, 0);
                    return result;
                };
            };

            interceptHistoryMethod('pushState');
            interceptHistoryMethod('replaceState');
            window.historyIntercepted = true;
        }

        // save handler so we can remove it later if needed
        window.urlChangeHandler = checkUrl;

        // get rid of old popstate if it exists to avoid duplicates
        if (window.urlChangeHandler) {
            window.removeEventListener('popstate', window.urlChangeHandler);
        }
        window.addEventListener('popstate', checkUrl);
    }

    /*******************************************************
    name of function: validateManualMode
    description: Check if user set their location manually
    or if it is still in automatic. Some error handling also
    *******************************************************/
    // why tf did i put this all the way down here
    function validateManualMode() {
        // if manual mode
        if (localStorage.getItem("ROLOCATE_prioritylocation") === "manual") {
            ConsoleLogEnabled("Manual mode detected");

            try {
                // get cooridnates
                const coords = JSON.parse(GM_getValue("ROLOCATE_coordinates", '{"lat":"","lng":""}'));
                ConsoleLogEnabled("Coordinates fetched:", coords);

                // if coordiates are missing switch to auatomcait
                if (!coords.lat || !coords.lng) {
                    localStorage.setItem("ROLOCATE_prioritylocation", "automatic");
                    ConsoleLogEnabled("No coordinates set. Switched to automatic mode.");
                    return true;
                }
            } catch (error) {
                ConsoleLogEnabled("Error checking coordinates:", error);
                // if error swithc to automatic
                localStorage.setItem("ROLOCATE_prioritylocation", "automatic");
                ConsoleLogEnabled("Error encountered while fetching coordinates. Switched to automatic mode.");
                return true;
            }
        }
        ConsoleLogEnabled("No Errors detected with manual mode.");
        return false;
    }



    /*******************************************************
    name of function: loadBase64Library
    description: Loads base64 images
    *******************************************************/
    function loadBase64Library(callback, timeout = 5000) {
        let elapsed = 0;
        (function waitForLibrary() {
            if (typeof window.Base64Images === "undefined") {
                if (elapsed < timeout) {
                    elapsed += 50;
                    setTimeout(waitForLibrary, 50);
                } else {
                    ConsoleLogEnabled("Base64Images did not load within the timeout.");
                    notifications('An error occurred! No icons will show. Please refresh the page.', 'error', '⚠️', '8000');
                }
            } else {
                if (callback) callback();
            }
        })();
    }



    /*******************************************************
    name of function: loadbetterprofileinfo
    description: "Better Profile Info" stats and mutkla frineds
    Stats: Joined Date, Account Age, Friend Count, Mutual Friends, Followers, Following
    *******************************************************/
    async function loadbetterprofileinfo() {
        if (localStorage.getItem("ROLOCATE_loadbetterprofileinfo") !== "true" || !/^\/(?:[a-z]{2}\/)?users\/\d+\/profile$/.test(window.location.pathname)) return;

        let avatarCache = {};

        // -- api helpers --

        const postJson = (url, body) => new Promise(resolve => {
            GM_xmlhttpRequest({
                method: "POST", url,
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify(body),
                onload: res => {
                    if (res.status === 429) { resolve(null); return; }
                    try { resolve(res.status < 300 ? JSON.parse(res.responseText) : null); }
                    catch { resolve(null); }
                },
                onerror: () => resolve(null)
            });
        });

        const getJson = url => new Promise(resolve => {
            GM_xmlhttpRequest({
                method: "GET", url,
                onload: res => {
                    if (res.status === 429) { resolve(null); return; }
                    try { resolve(res.status < 300 ? JSON.parse(res.responseText) : null); }
                    catch { resolve(null); }
                },
                onerror: () => resolve(null)
            });
        });

        const fetchUser         = id  => getJson(`https://users.roblox.com/v1/users/${id}`);
        const fetchUsersBatch   = ids => ids.length
            ? postJson("https://users.roblox.com/v1/users", { userIds: ids.slice(0, 100) }).then(r => r?.data || [])
            : Promise.resolve([]);
        const fetchFriends      = id  => getJson(`https://friends.roblox.com/v1/users/${id}/friends`).then(r => r?.data || null);

        // -- formatting utils --

        const formatAccountAge = created => {
            const days = Math.floor((Date.now() - new Date(created)) / 86400000);
            if (days < 30)  return `${days} day${days !== 1 ? 's' : ''}`;
            if (days < 365) { const months = Math.floor(days / 30); return `${months} month${months !== 1 ? 's' : ''}`; }
            const years = Math.floor(days / 365), months = Math.floor((days % 365) / 30);
            return months ? `${years}y ${months}mo` : `${years} year${years !== 1 ? 's' : ''}`;
        };

        const formatJoinDate = created =>
            new Date(created).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

        const formatNum = n => n === null || n === undefined ? '—' : Number(n).toLocaleString();

        // -- styles --

        const injectStyles = () => {
            if (document.querySelector('#bpi-styles')) return;
            const styleEl = document.createElement('style');
            styleEl.id = 'bpi-styles';
            styleEl.textContent = `
          /* section wrapper */
          .bpi-section {
              margin: 24px 0;
              display: flex;
              flex-direction: column;
              gap: 12px;
          }
          .bpi-section-label {
              font: 700 11px "Source Sans Pro", Arial, sans-serif;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #6b6b75;
          }

          /* stat card row */
          .bpi-stat-row {
              display: grid;
              grid-template-columns: repeat(6, 1fr);
              gap: 10px;
          }
          @media (max-width: 700px) { .bpi-stat-row { grid-template-columns: repeat(3, 1fr); } }
          @media (max-width: 420px) { .bpi-stat-row { grid-template-columns: repeat(2, 1fr); } }

          /* individual stat card */
          .bpi-card {
              background: #1a1a1e;
              border: 1px solid #26262c;
              border-radius: 20px;
              padding: 14px 16px;
              display: flex;
              flex-direction: column;
              gap: 5px;
              animation: bpi-up .25s cubic-bezier(.34,1.56,.64,1) backwards;
              transition: border-color .15s, background .15s, transform .15s, box-shadow .15s;
              min-width: 0;
          }
          .bpi-card.clickable {
              cursor: pointer;
          }
          .bpi-card.clickable:hover {
              border-color: #3a5ea3;
              background: #1d1d23;
              transform: translateY(-2px) scale(1.03);
              box-shadow: 0 6px 18px rgba(58, 94, 163, .18);
          }
          .bpi-card.clickable:active {
              transform: scale(.97);
              box-shadow: none;
          }
          .bpi-card-label {
              font: 600 10px "Source Sans Pro", Arial, sans-serif;
              text-transform: uppercase;
              letter-spacing: .7px;
              color: #6b6b75;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
          }
          .bpi-card-value {
              font: 700 17px "Source Sans Pro", Arial, sans-serif;
              color: #e8e8ec;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              line-height: 1.3;
          }

          /* mutual friends block */
          .bpi-mf-block {
              background: #1a1a1e;
              border: 1px solid #26262c;
              border-radius: 20px;
              overflow: hidden;
              animation: bpi-up .25s cubic-bezier(.34,1.56,.64,1) backwards;
              animation-delay: .1s;
          }
          .bpi-mf-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 12px 16px;
              border-bottom: 1px solid #26262c;
          }
          .bpi-mf-title {
              font: 700 13px "Source Sans Pro", Arial, sans-serif;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #6b6b75;
          }
          .bpi-mf-count {
              font: 700 13px "Source Sans Pro", Arial, sans-serif;
              color: #3a5ea3;
              background: rgba(58, 94, 163, .12);
              border-radius: 999px;
              padding: 2px 10px;
          }

          .bpi-mf-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
              gap: 1px;
              background: #26262c;
          }
          .bpi-mf-row {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 13px 16px;
              background: #1a1a1e;
              cursor: pointer;
              transition: background .12s, transform .12s;
              animation: bpi-fade .18s ease-out backwards;
          }
          .bpi-mf-row:hover {
              background: #1d1d23;
          }
          .bpi-mf-row:active {
              transform: scale(.97);
          }

          .bpi-mf-thumb {
              width: 38px;
              height: 38px;
              border-radius: 50%;
              border: 2px solid #26262c;
              overflow: hidden;
              flex-shrink: 0;
              background: #121215;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 15px;
              transition: border-color .15s, transform .15s;
          }
          .bpi-mf-row:hover .bpi-mf-thumb {
              border-color: #3a5ea3;
              transform: scale(1.08);
          }
          .bpi-mf-thumb img {
              width: 100%;
              height: 100%;
              object-fit: cover;
          }
          .bpi-mf-info {
              overflow: hidden;
              flex: 1;
          }
          .bpi-mf-name {
              font: 600 14px "Source Sans Pro", Arial, sans-serif;
              color: #d8d8de;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
          }
          .bpi-mf-age {
              font: 400 12px "Source Sans Pro", Arial, sans-serif;
              color: #6b6b75;
          }
          .bpi-mf-arrow {
              color: #3a5ea3;
              font-size: 16px;
              flex-shrink: 0;
              transition: transform .15s;
          }
          .bpi-mf-row:hover .bpi-mf-arrow {
              transform: translateX(3px);
          }

          /* "view all" cell */
          .bpi-mf-viewall .bpi-mf-name { color: #3a5ea3; }
          .bpi-mf-viewall:hover .bpi-mf-name { color: #6b9de8; }
          .bpi-mf-viewall-icon {
              background: #121215;
              border: 1px solid rgba(58, 94, 163, .4);
              border-radius: 50%;
              color: #3a5ea3;
              font: 700 11px "Source Sans Pro", Arial, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
          }

          /* empty / loading states */
          .bpi-mf-empty {
              padding: 20px 16px;
              color: #6b6b75;
              font: 400 13px "Source Sans Pro", Arial, sans-serif;
              font-style: italic;
          }
          .bpi-loading {
              display: flex;
              align-items: center;
              gap: 8px;
              color: #6b6b75;
              font: 400 12px "Source Sans Pro", Arial, sans-serif;
              padding: 4px 0;
          }
          .bpi-spinner {
              width: 13px;
              height: 13px;
              border: 2px solid #26262c;
              border-top-color: #3a5ea3;
              border-radius: 50%;
              animation: bpi-spin .7s linear infinite;
              flex-shrink: 0;
          }

          /* popup overlay */
          .bpi-overlay {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, .6);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 10000;
              animation: bpi-fadein .15s ease-out;
          }
          .bpi-popup {
              background: #1a1a1e;
              border: 1px solid #26262c;
              border-radius: 22px;
              width: 90%;
              max-width: 720px;
              max-height: 82vh;
              display: flex;
              flex-direction: column;
              overflow: hidden;
              box-shadow: 0 16px 48px rgba(0, 0, 0, .5);
              animation: bpi-pop .22s cubic-bezier(.34,1.45,.64,1);
          }
          .bpi-popup-head {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 18px 22px;
              border-bottom: 1px solid #26262c;
          }
          .bpi-popup-title {
              color: #e8e8ec;
              font: 700 16px "Source Sans Pro", Arial, sans-serif;
          }
          .bpi-popup-close {
              background: #121215;
              border: 1px solid #26262c;
              color: #9b9b9b;
              width: 30px;
              height: 30px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
              cursor: pointer;
              font-size: 18px;
              line-height: 1;
              transition: border-color .12s, color .12s, transform .15s;
          }
          .bpi-popup-close:hover {
              border-color: #3a5ea3;
              color: #e8e8ec;
              transform: rotate(90deg) scale(1.1);
          }
          .bpi-popup-grid {
              padding: 16px 22px;
              overflow-y: auto;
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
              gap: 10px;
          }
          .bpi-popup-grid::-webkit-scrollbar { width: 4px; }
          .bpi-popup-grid::-webkit-scrollbar-track { background: transparent; }
          .bpi-popup-grid::-webkit-scrollbar-thumb { background: rgba(58, 94, 163, .5); border-radius: 2px; }
          .bpi-popup-item {
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 13px 14px;
              background: #121215;
              border: 1px solid #26262c;
              border-radius: 16px;
              cursor: pointer;
              transition: border-color .12s, background .12s, transform .15s, box-shadow .15s;
              animation: bpi-slide .15s ease-out backwards;
          }
          .bpi-popup-item:hover {
              background: #1d1d23;
              border-color: #3a5ea3;
              transform: translateY(-2px) scale(1.02);
              box-shadow: 0 4px 14px rgba(58, 94, 163, .15);
          }
          .bpi-popup-item:active {
              transform: scale(.97);
              box-shadow: none;
          }
          .bpi-popup-avatar {
              width: 42px;
              height: 42px;
              border-radius: 50%;
              border: 2px solid #26262c;
              overflow: hidden;
              flex-shrink: 0;
              background: #1a1a1e;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
              transition: border-color .15s, transform .15s;
          }
          .bpi-popup-item:hover .bpi-popup-avatar {
              border-color: #3a5ea3;
              transform: scale(1.08);
          }
          .bpi-popup-avatar img {
              width: 100%;
              height: 100%;
              object-fit: cover;
          }
          .bpi-popup-name {
              font: 600 15px "Source Sans Pro", Arial, sans-serif;
              color: #e8e8ec;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
          }
          .bpi-popup-meta {
              font: 400 12px "Source Sans Pro", Arial, sans-serif;
              color: #6b6b75;
          }

          /* keyframes */
          @keyframes bpi-up    { from { opacity: 0; transform: translateY(8px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
          @keyframes bpi-fade  { from { opacity: 0; }                               to { opacity: 1; } }
          @keyframes bpi-spin  { to   { transform: rotate(360deg); } }
          @keyframes bpi-fadein{ from { opacity: 0; }                               to { opacity: 1; } }
          @keyframes bpi-fadeout{from { opacity: 1; }                               to { opacity: 0; } }
          @keyframes bpi-pop   { from { opacity: 0; transform: scale(.94); }        to { opacity: 1; transform: scale(1); } }
          @keyframes bpi-slide { from { opacity: 0; transform: translateX(-8px); }  to { opacity: 1; transform: translateX(0); } }
            `;
            document.head.appendChild(styleEl);
        };

        // mutal friuends popuyp

         const openMutualFriendsPopup = friends => {
            const overlay = document.createElement('div');
            overlay.className = 'bpi-overlay';

            let closing = false;
            const closePopup = () => {
                if (closing) return;
                closing = true;
                overlay.style.animation = 'bpi-fadeout .15s ease-out forwards';
                overlay.style.pointerEvents = 'none'; // immediately stop blocking clicks
                const tid = setTimeout(() => overlay.remove(), 160);
                overlay.addEventListener('animationend', () => {
                    clearTimeout(tid);
                    overlay.remove();
                }, { once: true });
            };

            overlay.innerHTML = `
                <div class="bpi-popup">
                    <div class="bpi-popup-head">
                        <span class="bpi-popup-title">All Mutual Friends (${friends.length})</span>
                        <button class="bpi-popup-close">×</button>
                    </div>
                    <div class="bpi-popup-grid"></div>
                </div>`;

            const grid = overlay.querySelector('.bpi-popup-grid');

            friends.forEach((friend, idx) => {
                const item = document.createElement('div');
                item.className = 'bpi-popup-item';
                item.style.animationDelay = `${Math.min(idx * 0.025, 0.2)}s`;

                const avatarUrl = avatarCache[friend.id];
                item.innerHTML = `
                    <div class="bpi-popup-avatar">${avatarUrl ? `<img src="${avatarUrl}">` : '👤'}</div>
                    <div style="overflow:hidden">
                        <div class="bpi-popup-name"></div>
                        <div class="bpi-popup-meta"></div>
                    </div>`;

                item.querySelector('.bpi-popup-name').textContent = friend.displayName || friend.name || `User${friend.id}`;
                item.querySelector('.bpi-popup-meta').textContent = friend.created
                    ? `${formatAccountAge(friend.created)} · ${formatJoinDate(friend.created)}`
                    : '';
                item.onclick = () => window.open(`https://www.roblox.com/users/${sanitizeUserId(friend.id)}/profile`, '_blank');

                grid.appendChild(item);
            });

            overlay.querySelector('.bpi-popup-close').onclick = closePopup;

            return overlay;
        };

        // -- render --

        const renderWidget = (section, { profile, friendCount, followerCount, followingCount, mutualFriends, otherUserId }) => {
            section.innerHTML = '';

            // stat cards
            const sectionLabel = document.createElement('div');
            sectionLabel.className = 'bpi-section-label';
            sectionLabel.textContent = 'Better Profile Info (RoLocate by Oqarshi)';
            section.appendChild(sectionLabel);

            const statRow = document.createElement('div');
            statRow.className = 'bpi-stat-row';
            section.appendChild(statRow);

            const statCards = [
                { label: 'Joined',         value: profile?.created ? formatJoinDate(profile.created)   : '—', href: null },
                { label: 'Account Age',    value: profile?.created ? formatAccountAge(profile.created) : '—', href: null },
                { label: 'Friends',        value: formatNum(friendCount),         href: `https://www.roblox.com/users/${otherUserId}/friends` },
                // clicking mutual friends card opens the popup
                { label: 'Mutual Friends', value: formatNum(mutualFriends.length), href: null, onClick: mutualFriends.length ? () => document.body.appendChild(openMutualFriendsPopup(mutualFriends)) : null },
                { label: 'Followers',      value: formatNum(followerCount),       href: `https://www.roblox.com/users/${otherUserId}/friends#!/followers` },
                { label: 'Following',      value: formatNum(followingCount),      href: `https://www.roblox.com/users/${otherUserId}/friends#!/following` },
            ];

            statCards.forEach(({ label, value, href, onClick }, idx) => {
                const card = document.createElement('div');
                const isClickable = href || onClick;
                card.className = `bpi-card${isClickable ? ' clickable' : ''}`;
                card.style.animationDelay = `${idx * 0.04}s`;
                card.innerHTML = `<div class="bpi-card-label"></div><div class="bpi-card-value"></div>`;
                card.querySelector('.bpi-card-label').textContent = label;
                card.querySelector('.bpi-card-value').textContent = value;
                if (onClick) card.onclick = onClick;
                else if (href) card.onclick = () => window.open(href, '_blank');
                statRow.appendChild(card);
            });

            // mutual friends list below the stat cards
            const mfBlock = document.createElement('div');
            mfBlock.className = 'bpi-mf-block';
            section.appendChild(mfBlock);

            const mfHeader = document.createElement('div');
            mfHeader.className = 'bpi-mf-header';
            mfHeader.innerHTML = `
                <span class="bpi-mf-title">Mutual Friends</span>
                ${mutualFriends.length ? `<span class="bpi-mf-count">${mutualFriends.length}</span>` : ''}`;
            mfBlock.appendChild(mfHeader);

            if (!mutualFriends.length) {
                const emptyMsg = document.createElement('div');
                emptyMsg.className = 'bpi-mf-empty';
                emptyMsg.textContent = 'No mutual friends. RoLocate by Oqarshi.';
                mfBlock.appendChild(emptyMsg);
                return;
            }

            const MAX_PREVIEW = 3;
            const grid = document.createElement('div');
            grid.className = 'bpi-mf-grid';
            mfBlock.appendChild(grid);

            mutualFriends.slice(0, MAX_PREVIEW).forEach((friend, idx) => {
                const row = document.createElement('div');
                row.className = 'bpi-mf-row';
                row.style.animationDelay = `${0.12 + idx * 0.03}s`;

                const avatarUrl = avatarCache[friend.id];
                row.innerHTML = `
                    <div class="bpi-mf-thumb">${avatarUrl ? `<img src="${avatarUrl}">` : '👤'}</div>
                    <div class="bpi-mf-info">
                        <div class="bpi-mf-name"></div>
                        ${friend.created ? `<div class="bpi-mf-age"></div>` : ''}
                    </div>
                    <span class="bpi-mf-arrow">›</span>`;

                row.querySelector('.bpi-mf-name').textContent = friend.displayName || friend.name || `User${friend.id}`;
                if (friend.created) row.querySelector('.bpi-mf-age').textContent = `${formatJoinDate(friend.created)} · ${formatAccountAge(friend.created)}`;
                row.onclick = () => window.open(`https://www.roblox.com/users/${friend.id}/profile`, '_blank');

                grid.appendChild(row);
            });

            // show a "view all" button if there are more than 3 mutual friends
            if (mutualFriends.length > MAX_PREVIEW) {
                const viewAllRow = document.createElement('div');
                viewAllRow.className = 'bpi-mf-row bpi-mf-viewall';
                viewAllRow.style.animationDelay = `${0.12 + MAX_PREVIEW * 0.03}s`;
                viewAllRow.innerHTML = `
                    <div class="bpi-mf-thumb bpi-mf-viewall-icon">+${mutualFriends.length - MAX_PREVIEW}</div>
                    <div class="bpi-mf-info">
                        <div class="bpi-mf-name">View All</div>
                        <div class="bpi-mf-age">${mutualFriends.length} mutual friends</div>
                    </div>
                    <span class="bpi-mf-arrow">›</span>`;
                viewAllRow.onclick = () => document.body.appendChild(openMutualFriendsPopup(mutualFriends));
                grid.appendChild(viewAllRow);
            }
        };

        // -- main --

        try {
            const currentUserId = getCurrentUserId();
            if (!currentUserId) return;

            const urlMatch = window.location.pathname.match(/^\/(?:[a-z]{2}\/)?users\/(\d+)\/profile$/);
            if (!urlMatch) return;

            const otherUserId = urlMatch[1];
            if (otherUserId === String(currentUserId)) return; // don't show on your own profile

            avatarCache = {};
            injectStyles();

            const insertionPoint = document.querySelector('ul.profile-tabs.flex');
            if (!insertionPoint) { ConsoleLogEnabled('[BPI] no insertion point'); return; }

            // placeholder while we load
            const section = document.createElement('div');
            section.className = 'bpi-section';
            section.innerHTML = `<div class="bpi-loading"><div class="bpi-spinner"></div>Loading...</div>`;
            insertionPoint.insertAdjacentElement('afterend', section);

            const [myFriends, theirFriends, stats] = await Promise.all([
                fetchFriends(currentUserId),
                fetchFriends(otherUserId),
                fetchUserStatsBatch(otherUserId)
            ]);
            const { userInfo: theirProfile, friendCount, followerCount, followingCount } = stats;

            if (!myFriends || !theirFriends) {
                section.innerHTML = '<div class="bpi-loading" style="color:#c06060">Failed to load data.</div>';
                return;
            }

            // find mutual friends by intersecting friend id sets
            const theirFriendIds = new Set(theirFriends.map(f => f.id));
            let mutualFriends = myFriends.filter(f => theirFriendIds.has(f.id));
            ConsoleLogEnabled(`[BPI] mutual friends: ${mutualFriends.length}`);

            if (mutualFriends.length) {
                // fetch display names + join dates for anyone missing them
                const missingNames = mutualFriends.filter(f => !f.name?.trim() || !f.displayName?.trim());
                const mutualIds    = mutualFriends.map(f => f.id);

                const [nameBatch, ageBatch] = await Promise.all([
                    fetchUsersBatch(missingNames.map(f => f.id)),
                    Promise.all(mutualIds.map(id => fetchUser(id)))
                ]);

                const nameMap = new Map((nameBatch || []).map(u => [u.id, u]));
                const ageMap  = new Map();
                ageBatch.forEach((res, idx) => { if (res?.created) ageMap.set(mutualIds[idx], res.created); });

                mutualFriends = mutualFriends.map(f => {
                    const nameData = nameMap.get(f.id);
                    return {
                        ...f,
                        name:        f.name?.trim()        || nameData?.name        || `User${f.id}`,
                        displayName: f.displayName?.trim() || nameData?.displayName || nameData?.name || `User${f.id}`,
                        created:     ageMap.get(f.id) || null
                    };
                });

                // make it cfdompatable with the now global function
                const thumbData = await fetchPlayerThumbnailsBatch(mutualFriends.map(f => f.id));
                avatarCache = Object.fromEntries(
                    (thumbData || [])
                        .filter(t => t.state === "Completed" && t.imageUrl)
                        .map(t => [t.targetId, t.imageUrl])
                );
            }

            renderWidget(section, { profile: theirProfile, friendCount, followerCount, followingCount, mutualFriends, otherUserId });
            ConsoleLogEnabled('[BPI] loaded ok');

        } catch (err) {
            ConsoleLogEnabled('[BPI] error:', err);
        }
    }



    /*******************************************************
    name of function: manageRobloxChatBar
    description: Disables roblox chat when ROLOCATE_disablechat is true
    *******************************************************/
    function manageRobloxChatBar() {
        if (localStorage.getItem('ROLOCATE_disablechat') !== "true") return;
        const CHAT_ID = 'chat-container';
        let chatObserver = null;

        // cleanup stuff so we dont leak memory
        const cleanup_managechatbar = () => chatObserver?.disconnect();
        // remove the chat bar
        const removeChatBar = () => {
            const chat = document.getElementById(CHAT_ID);
            if (chat) {
                chat.remove();
                ConsoleLogEnabled('Roblox chat bar removed');
                cleanup_managechatbar();
                return true;
            }
            return false;
        };

        // try removing it right away
        if (removeChatBar()) return;
        // if not found yet, watch for it
        chatObserver = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (!mutation.addedNodes) continue;
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1 && (node.id === CHAT_ID || node.querySelector(`#${CHAT_ID}`))) {
                        if (removeChatBar()) return;
                    }
                }
            }
        });

        // start watching
        document.body && chatObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // give up after 30 seconds
        const timeout = setTimeout(() => {
            cleanup_managechatbar();
            ConsoleLogEnabled('Chat removal observer timeout');
        }, 30000);

        // return cleanup function
        return () => {
            cleanup_managechatbar();
            clearTimeout(timeout);
        };
    }



    /*******************************************************
    name: SmartSearch
    desc: smartsearch like better search with games, users, catalog, and groups
    *******************************************************/
    function SmartSearch() {
        if (localStorage.ROLOCATE_smartsearch !== "true") return;
        // set friend list so later on in the user tab if a friend is found add friend label
        let friendList = [], friendIdSet = new Set(), friendListFetched = false, friendListFetching = false;

        // quick l;aunch on like the smart search yeeeeeee
        function triggerQuickLaunchUpdate(placeId, action) {
            // basicalyl if on homepage uopdates it liike isntanyl
            const event = new CustomEvent('quicklaunch-update', {
                detail: { placeId: placeId, action: action }
            });
            window.dispatchEvent(event);
        }

        function isGameInQuickLaunch(placeId) {
            const games = JSON.parse(localStorage.getItem('ROLOCATE_quicklaunch_games_storage') || '[]');
            return games.includes(placeId.toString());
        }

        function isQuickLaunchEnabled() {
            return localStorage.getItem('ROLOCATE_quicklaunchgames') === 'true';
        }

        function addToQuickLaunch(placeId) {
            const games = JSON.parse(localStorage.getItem('ROLOCATE_quicklaunch_games_storage') || '[]');
            if (games.length >= 10) {
                notifications('Maximum 10 games allowed in Quick Launch', 'error', '⚠️', '4000');
                return false;
            }

            if (!games.includes(placeId.toString())) {
                games.push(placeId.toString());
                localStorage.setItem('ROLOCATE_quicklaunch_games_storage', JSON.stringify(games));
                return true;
            }
            return false;
        }

        function removeFromQuickLaunch(placeId) {
            const games = JSON.parse(localStorage.getItem('ROLOCATE_quicklaunch_games_storage') || '[]');
            const updatedGames = games.filter(id => id !== placeId.toString());
            localStorage.setItem('ROLOCATE_quicklaunch_games_storage', JSON.stringify(updatedGames));
        }

        async function fetchFriendList(userId) {
            return new Promise((resolve) => {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: `https://friends.roblox.com/v1/users/${userId}/friends`,
                    headers: {"Accept": "application/json"},
                    onload: function(response) {
                        if (response.status === 200) {
                            try { resolve(JSON.parse(response.responseText).data || []); }
                            catch (e) { resolve([]); }
                        } else resolve([]);
                    },
                    onerror: function() { resolve([]); }
                });
            });
        }

        function hasSubstringMatch(str, query) {
            if (query.length < 3) return false;
            return str.toLowerCase().includes(query.toLowerCase());
        }

        function chunkArray(array, size) {
            const chunks = [];
            for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
            return chunks;
        }

        // levenshteinDistance functiuon. leetcode
        function levenshteinDistance(a, b) {
            const matrix = Array(b.length + 1).fill().map(() => Array(a.length + 1).fill(0));
            for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
            for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
            for (let j = 1; j <= b.length; j++) {
                for (let i = 1; i <= a.length; i++) {
                    const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
                    matrix[j][i] = Math.min(
                        matrix[j][i - 1] + 1,
                        matrix[j - 1][i] + 1,
                        matrix[j - 1][i - 1] + indicator
                    );
                }
            }
            return matrix[b.length][a.length];
        }

        // custom similarity function to determine similarity
        function getSimilarityScore(str1, str2) {
            ConsoleLogEnabled("Original strings:", {str1, str2});

            // no emojis yea
            const removeEmojisAndClean = (str) =>
                str.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
                   .toLowerCase().replace(/[^a-z0-9]/g, '');

            const searchQuery = removeEmojisAndClean(str1);
            const targetText = removeEmojisAndClean(str2);
            ConsoleLogEnabled("Cleaned strings:", {searchQuery, targetText});

            // if something includes the samething then its prob a match
            if (searchQuery.includes(targetText) || targetText.includes(searchQuery)) {
                ConsoleLogEnabled("One string includes the other.");

                const longerText = searchQuery.length > targetText.length ? searchQuery : targetText;
                const shorterText = searchQuery.length > targetText.length ? targetText : searchQuery;

                ConsoleLogEnabled("Longer string:", longerText);
                ConsoleLogEnabled("Shorter string:", shorterText);

                // uh increase score if it has like lengths
                let matchScore = 0.8 + (shorterText.length / longerText.length) * 0.15;
                ConsoleLogEnabled("Base score (inclusion case):", matchScore);

                if (searchQuery === targetText) {
                    ConsoleLogEnabled("Exact match.");
                    return 1.0;
                }

                const result = Math.min(0.95, matchScore);
                ConsoleLogEnabled("Inclusion final score:", result);
                return result;
            }

            // if no direct match do distance claucaltion instead
            const maxLen = Math.max(searchQuery.length, targetText.length);

            if (maxLen === 0) {
                ConsoleLogEnabled("uh maybe all emojis returning 1");
                return 1;
            }

            const editDistance = levenshteinDistance(searchQuery, targetText);
            const distanceScore = 1 - (editDistance / maxLen);

            ConsoleLogEnabled("Levenshtein distance:", editDistance);
            ConsoleLogEnabled("Levenshtein score:", distanceScore);

            // comon chunks then yeasss
            const minLen = Math.min(searchQuery.length, targetText.length);
            let bonusPoints = 0;
            let bestMatch = 0;

            for (let i = 0; i < searchQuery.length; i++) {
                for (let j = 0; j < targetText.length; j++) {
                    let matchLen = 0;
                    while (i + matchLen < searchQuery.length &&
                           j + matchLen < targetText.length &&
                           searchQuery[i + matchLen] === targetText[j + matchLen]) {
                        matchLen++;
                    }

                    if (matchLen > bestMatch) bestMatch = matchLen;
                }
            }

            ConsoleLogEnabled("longest matching substring length:", bestMatch);

            // boost if its decent ig
            if (bestMatch >= 3) {
                bonusPoints = (bestMatch / minLen) * 0.5;
                ConsoleLogEnabled("boosting subtring:", bonusPoints);
            } else {
                ConsoleLogEnabled("no substring boost applied");
            }

            const finalScore = Math.min(0.95, distanceScore + bonusPoints);
            ConsoleLogEnabled("final similarity score:", finalScore);

            return finalScore; // this is the final score to rank the items
        }

        // uh like u know shorten numbers
        function formatNumberCount(num) {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M+';
            else if (num >= 1000) return (num / 1000).toFixed(1) + 'K+';
            else return num.toString();
        }

        // format dates
        function formatDate(dateString) {
            const date = new Date(dateString);
            const options = {year: 'numeric', month: 'short', day: 'numeric'};
            return date.toLocaleDateString('en-US', options);
        }

        /*******************************************************
        search fucntionssnsnsn
        *******************************************************/
        async function fetchGameSearchResults(query) {
            const sessionId = Date.now();
            const apiUrl = `https://apis.roblox.com/search-api/omni-search?searchQuery=${encodeURIComponent(query)}&pageToken=&sessionId=${sessionId}&pageType=all`;
            contentArea.innerHTML = '<div class="ROLOCATE_SMARTSEARCH_loading">Loading games...</div>';
            try {
                const response = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({method: "GET", url: apiUrl, headers: {"Accept": "application/json"}, onload: resolve, onerror: reject});
                });
                if (response.status === 200) {
                    const data = JSON.parse(response.responseText);
                    const searchResults = data.searchResults || [];
                    const allGames = searchResults.map(result => result.contents[0]);
                    const gamesWithSimilarity = allGames.map(game => ({...game, similarity: getSimilarityScore(query, game.name)}));
                    const sortedGames = gamesWithSimilarity.sort((a, b) => {
                        const similarityA = a.similarity; const similarityB = b.similarity;
                        if ((similarityA >= 0.80 && similarityB >= 0.80) || Math.abs(similarityA - similarityB) < 0.0001) return b.playerCount - a.playerCount;
                        return similarityB - similarityA;
                    });
                    const games = sortedGames.slice(0, 30);
                    const activeTab = document.querySelector('.ROLOCATE_SMARTSEARCH_dropdown-tab.ROLOCATE_SMARTSEARCH_active')?.textContent;
                    if (activeTab !== "Games") return;
                    if (games.length === 0) {
                        contentArea.innerHTML = '<div class="ROLOCATE_SMARTSEARCH_no-results">No results found</div>';
                        return;
                    }
                    // the game cards in smart search yea crap thgis took ma long time
                    contentArea.innerHTML = games.map(game => {
                        const isInQuickLaunch = isGameInQuickLaunch(game.rootPlaceId);
                        const quickLaunchEnabled = isQuickLaunchEnabled(); // yea im cool for making a variable to calla function
                        return `
                        <div class="ROLOCATE_SMARTSEARCH_game-card-container">
                            <a href="https://www.roblox.com/games/${game.rootPlaceId}" class="ROLOCATE_SMARTSEARCH_game-card-link" target="_self">
                                <div class="ROLOCATE_SMARTSEARCH_game-card">
                                    <div class="ROLOCATE_SMARTSEARCH_thumbnail-loading" data-universe-id="${game.universeId}"></div>
                                    <div class="ROLOCATE_SMARTSEARCH_game-info">
                                        <h3 class="ROLOCATE_SMARTSEARCH_game-name">${game.name}</h3>
                                        <p class="ROLOCATE_SMARTSEARCH_game-stats">
                                            Players: ${formatNumberCount(game.playerCount)} |
                                            <span class="ROLOCATE_SMARTSEARCH_thumbs-up">👍      ${formatNumberCount(game.totalUpVotes)}</span> |
                                            <span class="ROLOCATE_SMARTSEARCH_thumbs-down">👎      ${formatNumberCount(game.totalDownVotes)}</span>
                                        </p>
                                    </div>
                                </div>
                            </a>
                            <button class="ROLOCATE_SMARTSEARCH_quicklaunch-button ${isInQuickLaunch ? 'added' : ''} ${!quickLaunchEnabled ? 'disabled' : ''}"
                                    data-place-id="${game.rootPlaceId}"
                                    title="${!quickLaunchEnabled ? 'Button disabled: Quick Launch is disabled' : (isInQuickLaunch ? 'Remove from Quick Launch' : 'Add to Quick Launch')}">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="checkmark">
                                    ${isInQuickLaunch
                                        ? '<path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
                                        : '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
                                    }
                                </svg>
                                ${isInQuickLaunch ? `
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="x-mark">
                                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                ` : ''}
                            </button>
                            <button class="ROLOCATE_SMARTSEARCH_play-button"
                                    data-place-id="${game.rootPlaceId}"
                                    title="Quick Join">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8 5V19L19 12L8 5Z" fill="#4CAF50"/>
                                </svg>
                            </button>
                        </div>
                    `}).join('');
                    setTimeout(() => {
                        // Play button listeners
                        document.querySelectorAll('.ROLOCATE_SMARTSEARCH_play-button').forEach(button => {
                            button.addEventListener('click', function(e) {
                                e.preventDefault();
                                e.stopPropagation();
                                const placeId = this.getAttribute('data-place-id');
                                window.location.href = `https://www.roblox.com/games/${placeId}#?ROLOCATE_QUICKJOIN`;
                            });
                        });

                        // quick Launch button listeners
                        document.querySelectorAll('.ROLOCATE_SMARTSEARCH_quicklaunch-button').forEach(button => {
                            button.addEventListener('click', function(e) {
                                e.preventDefault();
                                e.stopPropagation();

                                // a check to do nothing if something breaks and button isnt grayed out for some reason
                                if (!isQuickLaunchEnabled()) {
                                    notifications('Button disabled because Quick Launch Games is Disabled.', 'error', '⚠️', '6000');
                                    return; // do ntohign if disabled
                                }

                                const placeId = this.getAttribute('data-place-id');
                                const isAdded = this.classList.contains('added');

                                // ok so basically this like shows the buttons for quicklaunchn. check amrk, x mark, the plus mark, and gray out stuff
                                if (isAdded) {
                                    removeFromQuickLaunch(placeId);
                                    this.classList.remove('added');
                                    this.title = 'Add to Quick Launch';
                                    this.innerHTML = `
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    `;
                                    triggerQuickLaunchUpdate(placeId, 'remove');
                                    notifications('Removed from Quick Launch Games!', 'success', '', '3000');
                                } else {
                                    const success = addToQuickLaunch(placeId);
                                    if (success) {
                                        this.classList.add('added');
                                        this.title = 'Remove from Quick Launch';
                                        this.innerHTML = `
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="checkmark">
                                                <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            </svg>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="x-mark">
                                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            </svg>
                                        `;
                                        triggerQuickLaunchUpdate(placeId, 'add');
                                        notifications('Added to Quick Launch Games!', 'success', '', '3000');
                                    }
                                }
                            });
                        });
                    }, 100);
                    const universeIds = games.map(game => game.universeId);
                    const thumbnailBatches = chunkArray(universeIds, 10);
                    for (const batch of thumbnailBatches) {
                        try {
                            const thumbnailMap = await getGameIconFromUniverseId(batch);
                            Object.entries(thumbnailMap).forEach(([targetId, imageUrl]) => {
                                const loadingElement = document.querySelector(`.ROLOCATE_SMARTSEARCH_thumbnail-loading[data-universe-id="${targetId}"]`);
                                if (loadingElement) {
                                    loadingElement.outerHTML = `<img src="${imageUrl}" alt="${games.find(g => g.universeId == targetId)?.name || 'Game'}" class="ROLOCATE_SMARTSEARCH_game-thumbnail">`;
                                }
                            });
                        } catch (error) { ConsoleLogEnabled('Error fetching game thumbnails:', error); }
                    }
                } else contentArea.innerHTML = '<div class="ROLOCATE_SMARTSEARCH_error">Error loading results</div>';
            } catch (error) {
                ConsoleLogEnabled('Error in game search:', error);
                contentArea.innerHTML = '<div class="ROLOCATE_SMARTSEARCH_error">Error loading results</div>';
            }
        }

        // Uhh user results for the suer thing in smartsearch
        async function fetchUserSearchResults(query) {
            const sessionId = Date.now();
            const apiUrl = `https://apis.roblox.com/search-api/omni-search?verticalType=user&searchQuery=${encodeURIComponent(query)}&pageToken=&globalSessionId=${sessionId}&sessionId=${sessionId}`;
            contentArea.innerHTML = '<div class="ROLOCATE_SMARTSEARCH_loading">Loading users...</div>';
            try {
                const response = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({method: "GET", url: apiUrl, headers: {"Accept": "application/json"}, onload: resolve, onerror: reject});
                });
                if (response.status === 200) {
                    const data = JSON.parse(response.responseText);
                    const userGroup = data.searchResults?.find(group => group.contentGroupType === "User");
                    const apiUsers = userGroup?.contents || [];
                    // exact username lookup - always show as first result
                    let exactMatchUser = null;
                    try {
                        const exactLookupResponse = await new Promise((resolve, reject) => {
                            GM_xmlhttpRequest({
                                method: "POST",
                                url: 'https://users.roblox.com/v1/usernames/users',
                                headers: {"Accept": "application/json", "Content-Type": "application/json"},
                                data: JSON.stringify({ usernames: [query], excludeBannedUsers: false }),
                                onload: resolve,
                                onerror: reject
                            });
                        });
                        if (exactLookupResponse.status === 200) {
                            const exactData = JSON.parse(exactLookupResponse.responseText);
                            const exactUser = exactData.data?.[0];
                            if (exactUser) {
                                const detailResponse = await new Promise((resolve, reject) => {
                                    GM_xmlhttpRequest({
                                        method: "GET",
                                        url: `https://users.roblox.com/v1/users/${exactUser.id}`,
                                        headers: {"Accept": "application/json"},
                                        onload: resolve,
                                        onerror: reject
                                    });
                                });
                                if (detailResponse.status === 200) {
                                    const detailData = JSON.parse(detailResponse.responseText);
                                    exactMatchUser = {
                                        contentId: detailData.id,
                                        username: detailData.name,
                                        displayName: detailData.displayName,
                                        hasVerifiedBadge: detailData.hasVerifiedBadge,
                                        isBanned: detailData.isBanned,
                                        isExactMatch: true,
                                        isFriend: false
                                    };
                                }
                            }
                        }
                    } catch (e) { ConsoleLogEnabled('Exact username lookup failed:', e); }
                    const currentUserId = getCurrentUserId();
                    if (currentUserId && !friendListFetched && !friendListFetching) {
                        friendListFetching = true;
                        friendList = await fetchFriendList(currentUserId);
                        friendIdSet = new Set(friendList.map(friend => friend.id));
                        friendListFetched = true;
                        friendListFetching = false;
                    }
                    const matchedFriends = [];
                    if (query.length >= 3 && friendListFetched) {
                        friendList.forEach(friend => {
                            const nameMatch = hasSubstringMatch(friend.name, query);
                            const displayMatch = friend.displayName && hasSubstringMatch(friend.displayName, query);
                            if (nameMatch || displayMatch) {
                                matchedFriends.push({
                                    contentId: friend.id,
                                    username: friend.name,
                                    displayName: friend.displayName || friend.name,
                                    isFriend: true,
                                    hasVerifiedBadge: false,
                                });
                            }
                        });
                    }
                    // wow cool programming donehere
                    if (exactMatchUser) exactMatchUser.isFriend = friendIdSet.has(exactMatchUser.contentId);
                    let combinedResults = [
                        ...apiUsers.map(user => ({...user, isFriend: friendIdSet.has(user.contentId)})),
                        ...matchedFriends.filter(friend => !apiUsers.some(u => u.contentId === friend.contentId))
                    ];
                    if (exactMatchUser) {
                        combinedResults = combinedResults.filter(u => u.contentId !== exactMatchUser.contentId);
                        combinedResults.unshift(exactMatchUser);
                    }
                    combinedResults.sort((a, b) => {
                        if (a.isFriend && !b.isFriend) return -1;
                        if (!a.isFriend && b.isFriend) return 1;
                        return 0;
                    });
                    const users = combinedResults.slice(0, 30);
                    if (users.length === 0) {
                        contentArea.innerHTML = '<div class="ROLOCATE_SMARTSEARCH_no-results">No users found</div>';
                        return;
                    }

                    // whats in the user cards like name, follors, verify badge, friends, and the loading stats text for stats
                    // yes ik i used my profile :)
                    contentArea.innerHTML = users.map(user => `
                        <a href="${user.isBanned ? `https://www.roblox.com/users/545334824/profile#ROLOCATE_BANNED_USER_${user.contentId}` : `https://www.roblox.com/users/${user.contentId}/profile`}" class="ROLOCATE_SMARTSEARCH_user-card-link" target="_self">
                            <div class="ROLOCATE_SMARTSEARCH_user-card">
                                <div class="ROLOCATE_SMARTSEARCH_thumbnail-loading" data-user-id="${user.contentId}"></div>
                                <div class="ROLOCATE_SMARTSEARCH_user-info">
                                    <h3 class="ROLOCATE_SMARTSEARCH_user-display-name">
                                        ${user.displayName || user.username}
                                        ${user.hasVerifiedBadge ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 28 28" fill="none"><g clip-path="url(#a)"><path fill="#06f" d="m5.888 0 22.11 5.924-5.924 22.11-22.11-5.924z"/><path fill-rule="evenodd" clip-rule="evenodd" d="m20.543 8.75.006.007a1.54 1.54 0 0 1 0 2.176l-8.732 8.732-4.367-4.368a1.54 1.54 0 0 1 0-2.175l.007-.007a1.54 1.54 0 0 1 2.176 0l2.184 2.185 6.55-6.55a1.54 1.54 0 0 1 2.176 0" fill="#fff"/></g><defs><clipPath id="a"><path fill="#fff" d="M0 0h28v28H0z"/></clipPath></defs></svg>' : ''}
                                    </h3>
                                    <p class="ROLOCATE_SMARTSEARCH_user-username">
                                        @${user.username}
                                        ${user.isFriend ? '<span class="ROLOCATE_SMARTSEARCH_friend-badge">Friend</span>' : ''}
                                        ${user.isBanned ? '<span class="ROLOCATE_SMARTSEARCH_banned-badge">Banned</span>' : ''}
                                    </p>
                                    <p class="ROLOCATE_SMARTSEARCH_user-stats" data-user-id="${user.contentId}">
                                        <span class="ROLOCATE_SMARTSEARCH_stats-loading">Loading stats...</span>
                                    </p>
                                </div>
                            </div>
                        </a>
                    `).join('');

                    // this gets the user thumbnails for smartsearch
                    const userIds = users.map(user => user.contentId);
                    const thumbnailBatches = chunkArray(userIds, 10);
                    for (const batch of thumbnailBatches) {
                        try {
                            const thumbnails = await fetchPlayerThumbnailsBatch(batch);
                            thumbnails.forEach(thumb => {
                                const loadingElement = document.querySelector(`.ROLOCATE_SMARTSEARCH_thumbnail-loading[data-user-id="${thumb.targetId}"]`);
                                if (loadingElement) {
                                    loadingElement.outerHTML = `<img src="${thumb.imageUrl}" alt="${users.find(u => u.contentId == thumb.targetId)?.username || 'User'}" class="ROLOCATE_SMARTSEARCH_user-thumbnail">`;
                                }
                            });
                        } catch (error) { ConsoleLogEnabled('Error fetching user thumbnails:', error); }
                    }

                    // edited to fit new global functions
                    const statsBatches = chunkArray(userIds, 10);
                    for (const batch of statsBatches) {
                        try {
                            const stats = await Promise.all(batch.map(async userId => {
                                // here we send smartsearch to only get 2 requests
                                const [friendCount, followerCount] = await fetchUserStatsBatch(userId, "smartsearch");
                                // yea get the userid griend count and followercouint
                                return { userId, friendCount: friendCount?.count ?? 0, followerCount: followerCount?.count ?? 0 };
                            }));
                            stats.forEach(stat => {
                                const statsElement = document.querySelector(`.ROLOCATE_SMARTSEARCH_user-stats[data-user-id="${stat.userId}"]`);
                                if (statsElement) {
                                    statsElement.innerHTML = `
                                        <span class="ROLOCATE_SMARTSEARCH_stat-item">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:4px"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M23 21v-2a4 4 0 0 0-3-3.87m-4-12a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                            ${formatNumberCount(stat.friendCount)} Friends
                                        </span>&nbsp|&nbsp
                                        <span class="ROLOCATE_SMARTSEARCH_stat-item">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:4px"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8.5" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 8v6m3-3h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                            ${formatNumberCount(stat.followerCount)} Followers
                                        </span>
                                    `;
                                }
                            });
                        } catch (error) { ConsoleLogEnabled('Error fetching user stats:', error); }
                    }
                } else contentArea.innerHTML = '<div class="ROLOCATE_SMARTSEARCH_error">Error loading user results</div>';
            } catch (error) {
                ConsoleLogEnabled('Error in user search:', error);
                contentArea.innerHTML = '<div class="ROLOCATE_SMARTSEARCH_error">Error loading user results</div>';
            }
        }

        // reading the furnciton name should tell u what this is
        // ok so basically it shows members created and verified and logo and yea more stuff
        async function fetchGroupSearchResults(query) {
            const apiUrl = `https://groups.roblox.com/v1/groups/search?cursor=&keyword=${encodeURIComponent(query)}&limit=25&prioritizeExactMatch=true&sortOrder=Asc`;
            contentArea.innerHTML = '<div class="ROLOCATE_SMARTSEARCH_loading">Loading groups...</div>';
            try {
                const response = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({method: "GET", url: apiUrl, headers: {"Accept": "application/json"}, onload: resolve, onerror: reject});
                });
                if (response.status === 200) {
                    const data = JSON.parse(response.responseText);
                    const groups = data.data || [];
                    if (groups.length === 0) {
                        contentArea.innerHTML = '<div class="ROLOCATE_SMARTSEARCH_no-results">No groups found</div>';
                        return;
                    }
                    contentArea.innerHTML = groups.map(group => `
                        <a href="https://www.roblox.com/groups/${group.id}" class="ROLOCATE_SMARTSEARCH_group-card-link" target="_self">
                            <div class="ROLOCATE_SMARTSEARCH_group-card">
                                <div class="ROLOCATE_SMARTSEARCH_thumbnail-loading" data-group-id="${group.id}"></div>
                                <div class="ROLOCATE_SMARTSEARCH_group-info">
                                    <h3 class="ROLOCATE_SMARTSEARCH_group-name">
                                        ${group.name}
                                        ${group.hasVerifiedBadge ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 28 28" fill="none"><g clip-path="url(#a)"><path fill="#06f" d="m5.888 0 22.11 5.924-5.924 22.11-22.11-5.924z"/><path fill-rule="evenodd" clip-rule="evenodd" d="m20.543 8.75.006.007a1.54 1.54 0 0 1 0 2.176l-8.732 8.732-4.367-4.368a1.54 1.54 0 0 1 0-2.175l.007-.007a1.54 1.54 0 0 1 2.176 0l2.184 2.185 6.55-6.55a1.54 1.54 0 0 1 2.176 0" fill="#fff"/></g><defs><clipPath id="a"><path fill="#fff" d="M0 0h28v28H0z"/></clipPath></defs></svg>' : ''}
                                    </h3>
                                    <p class="ROLOCATE_SMARTSEARCH_group-members">Members: ${formatNumberCount(group.memberCount)}</p>
                                    <p class="ROLOCATE_SMARTSEARCH_group-created">Created: ${formatDate(group.created)}</p>
                                </div>
                            </div>
                        </a>
                    `).join('');
                    const groupIds = groups.map(group => group.id);
                    // ten thumbnail batchs at a time
                    const thumbnailBatches = chunkArray(groupIds, 10);
                    for (const batch of thumbnailBatches) {
                        try {
                            const thumbnails = await fetchGroupIconsBatch(batch);
                            thumbnails.forEach(thumb => {
                                const loadingElement = document.querySelector(`.ROLOCATE_SMARTSEARCH_thumbnail-loading[data-group-id="${thumb.targetId}"]`);
                                if (loadingElement) {
                                    loadingElement.outerHTML = `<img src="${thumb.imageUrl}" alt="${groups.find(g => g.id == thumb.targetId)?.name || 'Group'}" class="ROLOCATE_SMARTSEARCH_group-thumbnail">`;
                                }
                            });
                        } catch (error) { ConsoleLogEnabled('Error fetching group thumbnails:', error); }
                    }
                } else contentArea.innerHTML = '<div class="ROLOCATE_SMARTSEARCH_error">Error loading group results</div>';
            } catch (error) {
                ConsoleLogEnabled('Error in group search:', error);
                contentArea.innerHTML = '<div class="ROLOCATE_SMARTSEARCH_error">Error loading group results</div>';
            }
        }

        async function fetchCatalogSearchResults(query) {
            const apiUrl = `https://catalog.roblox.com/v1/search/items?keyword=${encodeURIComponent(query)}&category=All&salesTypeFilter=1&limit=30`;
            contentArea.innerHTML = '<div class="ROLOCATE_SMARTSEARCH_loading">Loading catalog items...</div>';
            try {
                const response = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({method: "GET", url: apiUrl, headers: {"Accept": "application/json"}, onload: resolve, onerror: reject});
                });
                if (response.status === 200) {
                    const data = JSON.parse(response.responseText);
                    const catalogItems = data.data || [];
                    if (catalogItems.length === 0) {
                        contentArea.innerHTML = '<div class="ROLOCATE_SMARTSEARCH_no-results">No catalog items found</div>';
                        return;
                    }
                    ConsoleLogEnabled('Creating fetch promises for Asset and Bundle types...');
                    const detailPromises_Asset = catalogItems.slice(0, 120).map(item => fetchCatalogItemDetails(item.id));
                    ConsoleLogEnabled('Waiting for Asset fetches to complete...');
                    const detailedResults_Asset = await Promise.all(detailPromises_Asset);
                    const itemsNeedingBundleRetry = catalogItems.slice(0, 120).filter((item, index) => detailedResults_Asset[index] === null);
                    ConsoleLogEnabled(`Failed as Asset, retrying as Bundle for ${itemsNeedingBundleRetry.length} items:`, itemsNeedingBundleRetry.map(i => i.id));
                    const detailPromises_Bundle = itemsNeedingBundleRetry.map(item =>
                        new Promise((resolve) => {
                            GM_xmlhttpRequest({
                                method: "GET",
                                url: `https://catalog.roblox.com/v1/catalog/items/${item.id}/details?itemType=Bundle`,
                                headers: {"Accept": "application/json"},
                                onload: function(response) {
                                    if (response.status === 200) {
                                        try { resolve(JSON.parse(response.responseText)); }
                                        catch (e) { resolve(null); }
                                    } else resolve(null);
                                },
                                onerror: function() { resolve(null); }
                            });
                        })
                    );
                    ConsoleLogEnabled('Waiting for Bundle fetches to complete...');
                    const detailedResults_Bundle = await Promise.all(detailPromises_Bundle);
                    const combinedResults = detailedResults_Asset.map((assetResult, index) => {
                        if (assetResult !== null) return { ...assetResult, __itemType: 'Asset' };
                        else {
                            const bundleIndex = itemsNeedingBundleRetry.findIndex(item => item.id === catalogItems[index].id);
                            return bundleIndex >= 0 ? { ...detailedResults_Bundle[bundleIndex], __itemType: 'Bundle' } : null;
                        }
                    });
                    const failedIds = catalogItems.slice(0, 100).filter((item, index) => combinedResults[index] === null).map(item => item.id);
                    ConsoleLogEnabled(`â    Failed to fetch details (Asset & Bundle) for ${failedIds.length} items:`, failedIds);
                    ConsoleLogEnabled('Filtering out completely failed requests...');
                    const detailedItems = combinedResults.filter(details => details !== null);
                    ConsoleLogEnabled(`â    Got ${detailedItems.length} valid items.`);
                    if (detailedItems.length === 0) {
                        contentArea.innerHTML = '<div class="ROLOCATE_SMARTSEARCH_no-results">No catalog items found</div>';
                        return;
                    }
                    contentArea.innerHTML = detailedItems.map(item => `
                        <a href="https://www.roblox.com/${item.__itemType === 'Bundle' ? 'bundles' : 'catalog'}/${item.id}" class="ROLOCATE_SMARTSEARCH_catalog-card-link" target="_self">
                            <div class="ROLOCATE_SMARTSEARCH_catalog-card">
                                <div class="ROLOCATE_SMARTSEARCH_thumbnail-loading" data-asset-id="${item.id}" data-item-type="${item.__itemType}"></div>
                                <div class="ROLOCATE_SMARTSEARCH_catalog-info">
                                <h3 class="ROLOCATE_SMARTSEARCH_catalog-name">${item.name}</h3>
                                <p class="ROLOCATE_SMARTSEARCH_catalog-price">
                                    ${item.priceStatus === "Free"
                                        ? '<span style="color:#4caf50;">Free</span>'
                                        : `<span style="color:#4caf50;">${item.price}</span> ⏣`}
                                    ${item.favoriteCount > 0 ? ` | <span style="color:#4caf50;">👍 ${formatNumberCount(item.favoriteCount)}</span>` : ''}
                                </p>
                                <p class="ROLOCATE_SMARTSEARCH_catalog-creator">
                                    by ${item.creatorName}
                                </p>

                                </div>
                            </div>
                        </a>
                    `).join('');
                    const assetIds = detailedItems.filter(item => item.__itemType === 'Asset').map(item => item.id);
                    const bundleIds = detailedItems.filter(item => item.__itemType === 'Bundle').map(item => item.id);
                    if (assetIds.length > 0) {
                        const assetThumbnailBatches = chunkArray(assetIds, 10);
                        for (const batch of assetThumbnailBatches) {
                            try {
                                const thumbnails = await fetchCatalogThumbnailsBatch(batch);
                                thumbnails.forEach(thumb => {
                                    const loadingElement = document.querySelector(`.ROLOCATE_SMARTSEARCH_thumbnail-loading[data-asset-id="${thumb.targetId}"]`);
                                    if (loadingElement) {
                                        loadingElement.outerHTML = `<img src="${thumb.imageUrl}" alt="${detailedItems.find(i => i.id == thumb.targetId)?.name || 'Item'}" class="ROLOCATE_SMARTSEARCH_catalog-thumbnail">`;
                                    }
                                });
                            } catch (error) { ConsoleLogEnabled('Error fetching catalog thumbnails:', error); }
                        }
                    }
                    if (bundleIds.length > 0) {
                        const bundleThumbnailBatches = chunkArray(bundleIds, 10);
                        for (const batch of bundleThumbnailBatches) {
                            try {
                                const thumbnails = await fetchBundleThumbnailsBatch(batch);
                                thumbnails.forEach(thumb => {
                                    const loadingElement = document.querySelector(`.ROLOCATE_SMARTSEARCH_thumbnail-loading[data-asset-id="${thumb.targetId}"]`);
                                    if (loadingElement) {
                                        loadingElement.outerHTML = `<img src="${thumb.imageUrl}" alt="${detailedItems.find(i => i.id == thumb.targetId)?.name || 'Bundle'}" class="ROLOCATE_SMARTSEARCH_catalog-thumbnail">`;
                                    }
                                });
                            } catch (error) { ConsoleLogEnabled('Error fetching bundle thumbnails:', error); }
                        }
                    }
                } else contentArea.innerHTML = '<div class="ROLOCATE_SMARTSEARCH_error">Error loading catalog results</div>';
            } catch (error) {
                ConsoleLogEnabled('Error in catalog search:', error);
                contentArea.innerHTML = '<div class="ROLOCATE_SMARTSEARCH_error">Error loading catalog results</div>';
            }
        }

        const originalSearchContainer = document.querySelector('[data-testid="navigation-search-input"]');
        if (!originalSearchContainer) {
            ConsoleLogEnabled('Search container not found');
            return false;
        }
        originalSearchContainer.remove();

        const customSearchContainer = document.createElement('div');
        customSearchContainer.className = 'navbar-left navbar-search col-xs-5 col-sm-6 col-md-2 col-lg-3 shown';
        customSearchContainer.setAttribute('role', 'search');
        customSearchContainer.style.marginTop = '4px';
        customSearchContainer.style.position = 'relative';

        const form = document.createElement('form');
        form.name = 'custom-search-form';
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (!query) return;
            const activeTab = document.querySelector('.ROLOCATE_SMARTSEARCH_dropdown-tab.ROLOCATE_SMARTSEARCH_active')?.dataset.tab;
            let url = '';
            switch (activeTab) {
                case 'games': url = `https://www.roblox.com/discover/?Keyword=${encodeURIComponent(query)}`; break;
                case 'users': url = `https://www.roblox.com/search/users?keyword=${encodeURIComponent(query)}`; break;
                case 'groups': url = `https://www.roblox.com/search/communities?keyword=${encodeURIComponent(query)}`; break;
                case 'catalog': url = `https://www.roblox.com/catalog?Keyword=${encodeURIComponent(query)}`; break;
                default: url = `https://www.roblox.com/discover/?Keyword=${encodeURIComponent(query)}`; break;
            }
            window.location.href = url;
        });

        const formWrapper = document.createElement('div');
        formWrapper.className = 'ROLOCATE_SMARTSEARCH_form-has-feedback';

        const searchInput = document.createElement('input');
        let wasPreviouslyBlurred = true; let lastInputValue = '';
        searchInput.addEventListener('focus', () => {
            if (wasPreviouslyBlurred) {
                const activeTab = document.querySelector('.ROLOCATE_SMARTSEARCH_dropdown-tab.ROLOCATE_SMARTSEARCH_active')?.textContent || 'Unknown';
                const typedText = searchInput.value.trim();
                ConsoleLogEnabled(`[SmartSearch] Search bar focused | Tab: ${activeTab} | Input: "${typedText}"`);
                wasPreviouslyBlurred = false;
            }
        });
        searchInput.addEventListener('blur', () => { wasPreviouslyBlurred = true; });

        searchInput.id = 'custom-navbar-search-input';
        searchInput.type = 'search';
        searchInput.className = 'form-control input-field ROLOCATE_SMARTSEARCH_custom-search-input';
        searchInput.placeholder = 'SmartSearch | RoLocate by Oqarshi';
        searchInput.maxLength = 120;
        searchInput.autocomplete = 'off';

        const searchIcon = document.createElement('span');
        searchIcon.className = 'icon-common-search-sm ROLOCATE_SMARTSEARCH_custom-search-icon';

        const dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'ROLOCATE_SMARTSEARCH_search-dropdown-menu';
        dropdownMenu.style.display = 'none';

        const navTabs = document.createElement('div');
        navTabs.className = 'ROLOCATE_SMARTSEARCH_dropdown-nav-tabs';
        const tabs = ['Games', 'Users', 'Groups', 'Catalog'];
        const tabButtons = [];
        tabs.forEach((tabName, index) => {
            const tabButton = document.createElement('button');
            tabButton.className = `ROLOCATE_SMARTSEARCH_dropdown-tab ${index === 0 ? 'ROLOCATE_SMARTSEARCH_active' : ''}`;
            tabButton.textContent = tabName;
            tabButton.type = 'button';
            tabButton.dataset.tab = tabName.toLowerCase();
            tabButtons.push(tabButton);
            navTabs.appendChild(tabButton);
        });

        const contentArea = document.createElement('div');
        contentArea.className = 'ROLOCATE_SMARTSEARCH_dropdown-content';
        contentArea.innerHTML = '<div class="ROLOCATE_SMARTSEARCH_content-text">Quickly search for <strong>games</strong> above!</div>';

        dropdownMenu.appendChild(navTabs);
        dropdownMenu.appendChild(contentArea);
        formWrapper.appendChild(searchInput);
        formWrapper.appendChild(searchIcon);
        form.appendChild(formWrapper);
        customSearchContainer.appendChild(form);
        customSearchContainer.appendChild(dropdownMenu);

        let isMenuOpen = false;
        searchInput.addEventListener('click', showDropdownMenu);
        searchInput.addEventListener('focus', showDropdownMenu);
        searchInput.addEventListener('input', function() {
            const currentValue = this.value.trim();
            if (currentValue && currentValue !== lastInputValue && !isMenuOpen) showDropdownMenu();
            lastInputValue = currentValue;
        });

        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                tabButtons.forEach(tab => tab.classList.remove('ROLOCATE_SMARTSEARCH_active'));
                button.classList.add('ROLOCATE_SMARTSEARCH_active');
                const query = searchInput.value.trim();
                if (query) {
                    if (button.textContent === "Games") fetchGameSearchResults(query);
                    else if (button.textContent === "Users") fetchUserSearchResults(query);
                    else if (button.textContent === "Groups") fetchGroupSearchResults(query);
                    else if (button.textContent === "Catalog") fetchCatalogSearchResults(query);
                } else {
                    if (button.textContent === "Games") contentArea.innerHTML = `<div class="ROLOCATE_SMARTSEARCH_content-text">Quickly search for <strong>games</strong> above!</div>`;
                    else if (button.textContent === "Users") contentArea.innerHTML = `<div class="ROLOCATE_SMARTSEARCH_content-text">Instantly find the <strong>user</strong> you're looking for!</div>`;
                    else if (button.textContent === "Groups") contentArea.innerHTML = `<div class="ROLOCATE_SMARTSEARCH_content-text">Search for <strong>groups</strong> rapidly.</div>`;
                    else if (button.textContent === "Catalog") contentArea.innerHTML = `<div class="ROLOCATE_SMARTSEARCH_content-text">Browse the <strong>catalog</strong> for items!</div>`;
                }
            });
        });

        document.addEventListener('click', (e) => {
            if (!customSearchContainer.contains(e.target)) hideDropdownMenu();
        });
        dropdownMenu.addEventListener('click', (e) => { e.stopPropagation(); });

        function showDropdownMenu() {
            isMenuOpen = true;
            dropdownMenu.style.display = 'block';
            formWrapper.classList.add('ROLOCATE_SMARTSEARCH_menu-open');
            setTimeout(() => { dropdownMenu.classList.add('ROLOCATE_SMARTSEARCH_show'); }, 10);
            const activeTab = document.querySelector('.ROLOCATE_SMARTSEARCH_dropdown-tab.ROLOCATE_SMARTSEARCH_active')?.textContent;
            const query = searchInput.value.trim();
            if (query) {
                if (activeTab === "Games" && contentArea.querySelector('.ROLOCATE_SMARTSEARCH_game-card') === null && contentArea.querySelector('.ROLOCATE_SMARTSEARCH_no-results') === null) fetchGameSearchResults(query);
                else if (activeTab === "Users" && contentArea.querySelector('.ROLOCATE_SMARTSEARCH_user-card') === null && contentArea.querySelector('.ROLOCATE_SMARTSEARCH_no-results') === null) fetchUserSearchResults(query);
                else if (activeTab === "Groups" && contentArea.querySelector('.ROLOCATE_SMARTSEARCH_group-card') === null && contentArea.querySelector('.ROLOCATE_SMARTSEARCH_no-results') === null) fetchGroupSearchResults(query);
                else if (activeTab === "Catalog" && contentArea.querySelector('.ROLOCATE_SMARTSEARCH_catalog-card') === null && contentArea.querySelector('.ROLOCATE_SMARTSEARCH_no-results') === null) fetchCatalogSearchResults(query);
            }
        }

        function hideDropdownMenu() {
            isMenuOpen = false;
            dropdownMenu.classList.remove('ROLOCATE_SMARTSEARCH_show');
            formWrapper.classList.remove('ROLOCATE_SMARTSEARCH_menu-open');
            setTimeout(() => { if (!isMenuOpen) dropdownMenu.style.display = 'none'; }, 200);
        }

        const rightNavigation = document.getElementById('right-navigation-header');
        if (rightNavigation) rightNavigation.insertBefore(customSearchContainer, rightNavigation.firstChild);

        let debounceTimeout;
        searchInput.addEventListener('input', () => {
            if (searchInput.value.trim() && !isMenuOpen) showDropdownMenu();
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                const query = searchInput.value.trim();
                const activeTab = document.querySelector('.ROLOCATE_SMARTSEARCH_dropdown-tab.ROLOCATE_SMARTSEARCH_active')?.textContent;
                if (!query) {
                    if (activeTab === "Games") contentArea.innerHTML = '<div class="ROLOCATE_SMARTSEARCH_content-text">Quickly search for <strong>games</strong> above!</div>';
                    else if (activeTab === "Users") contentArea.innerHTML = '<div class="ROLOCATE_SMARTSEARCH_content-text">Instantly find the <strong>user</strong> you\'re looking for!</div>';
                    else if (activeTab === "Groups") contentArea.innerHTML = '<div class="ROLOCATE_SMARTSEARCH_content-text">Search for <strong>groups</strong> rapidly.</div>';
                    else if (activeTab === "Catalog") contentArea.innerHTML = '<div class="ROLOCATE_SMARTSEARCH_content-text">Browse the <strong>catalog</strong> for items!</div>';
                    return;
                }
                if (activeTab === "Games") fetchGameSearchResults(query);
                else if (activeTab === "Users") fetchUserSearchResults(query);
                else if (activeTab === "Groups") fetchGroupSearchResults(query);
                else if (activeTab === "Catalog") fetchCatalogSearchResults(query);
            }, 250);
        });

        const style = document.createElement('style');
        // one day i gotta clean this up cause ik some of these styles arnt needed
        style.textContent = `
.ROLOCATE_SMARTSEARCH_form-has-feedback {
            position: relative !important;
            display: flex !important;
            align-items: center !important;
            border: 2px solid #2c2f36 !important;
            border-radius: 8px !important;
            background-color: ${isDarkMode() ? '#191a1f' : '#C1B19A'} !important;
            transition: all 0.3s ease !important;
            z-index: 1000 !important;
        }
        .ROLOCATE_SMARTSEARCH_form-has-feedback:focus-within,
        .ROLOCATE_SMARTSEARCH_form-has-feedback.ROLOCATE_SMARTSEARCH_menu-open {
            border-color: ${isDarkMode() ? '#00b2ff' : '#2c2f36'} !important;
        }
        .ROLOCATE_SMARTSEARCH_form-has-feedback.ROLOCATE_SMARTSEARCH_menu-open {
            border-bottom-left-radius: 0 !important;
            border-bottom-right-radius: 0 !important;
            border-bottom-color: transparent !important;
            position: relative !important;
        }
        .ROLOCATE_SMARTSEARCH_form-has-feedback.ROLOCATE_SMARTSEARCH_menu-open::after {
            content: '' !important;
            position: absolute !important;
            bottom: -12px !important;
            left: -2px !important;
            right: -2px !important;
            height: 12px !important;
            border-left: 2px solid ${isDarkMode() ? '#00b2ff' : '#2c2f36'} !important;
            border-right: 2px solid ${isDarkMode() ? '#00b2ff' : '#2c2f36'} !important;
            background-color: transparent !important;
            z-index: 1000 !important;
        }
        .ROLOCATE_SMARTSEARCH_custom-search-input {
            width: 100% !important;
            border: none !important;
            background-color: transparent !important;
            color: ${isDarkMode() ? 'white' : 'black'} !important;
            padding: 8px 36px 8px 12px !important;
            font-size: 16px !important;
            height: 27px !important;
            border-radius: 8px !important;
        }
        .ROLOCATE_SMARTSEARCH_custom-search-input:focus {
            outline: none !important;
            box-shadow: none !important;
        }
        .ROLOCATE_SMARTSEARCH_custom-search-input::placeholder {
            color: ${isDarkMode() ? '#8a8d93' : '#75726C'} !important;
            opacity: 1 !important;
        }
        .ROLOCATE_SMARTSEARCH_custom-search-icon {
            position: absolute !important;
            right: 10px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            pointer-events: none !important;
            font-size: 16px !important;
            color: #8a8d93 !important;
        }
        .ROLOCATE_SMARTSEARCH_form-has-feedback:focus-within .ROLOCATE_SMARTSEARCH_custom-search-icon,
        .ROLOCATE_SMARTSEARCH_form-has-feedback.ROLOCATE_SMARTSEARCH_menu-open .ROLOCATE_SMARTSEARCH_custom-search-icon {
            color: ${isDarkMode() ? '#00b2ff' : '#C1B19A'} !important;
        }
        .ROLOCATE_SMARTSEARCH_search-dropdown-menu {
            position: absolute !important;
            top: calc(100% - 2px) !important;
            left: 0 !important;
            width: 100% !important;
            background-color: ${isDarkMode() ? '#191a1f' : '#E0D8CC'} !important;
            border-left: 2px solid ${isDarkMode() ? '#00b2ff' : '#2c2f36'} !important;
            border-right: 2px solid ${isDarkMode() ? '#00b2ff' : '#2c2f36'} !important;
            border-bottom: 2px solid ${isDarkMode() ? '#00b2ff' : '#2c2f36'} !important;
            border-top: none !important;
            border-radius: 0 0 8px 8px !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
            z-index: 999 !important;
            opacity: 0 !important;
            transform: translateY(-10px) !important;
            transition: all 0.2s ease !important;
            box-sizing: border-box !important;
        }
        .ROLOCATE_SMARTSEARCH_search-dropdown-menu.ROLOCATE_SMARTSEARCH_show {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
        .ROLOCATE_SMARTSEARCH_dropdown-nav-tabs {
            display: flex !important;
            background-color: ${isDarkMode() ? '#1e2025' : '#C1B19A'} !important;
            border-bottom: 1px solid ${isDarkMode() ? '#2c2f36' : '#2c2f36'} !important;
        }
        .ROLOCATE_SMARTSEARCH_dropdown-tab {
            flex: 1 !important;
            padding: 12px 16px !important;
            background: none !important;
            border: none !important;
            color: ${isDarkMode() ? '#8a8d93' : 'white'} !important;
            font-size: 16px !important;
            font-weight: 500 !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            border-bottom: 2px solid transparent !important;
        }
        .ROLOCATE_SMARTSEARCH_dropdown-tab:hover {
            color: ${isDarkMode() ? 'white' : '#f7eddf'} !important;
            background-color: rgba(255, 255, 255, 0.05) !important;
        }
        .ROLOCATE_SMARTSEARCH_dropdown-tab.ROLOCATE_SMARTSEARCH_active {
            color: ${isDarkMode() ? '#00b2ff' : '#f7eddf'} !important;
            border-bottom-color: ${isDarkMode() ? '#00b2ff' : '#2c2f36'} !important;
            background-color: ${isDarkMode() ? 'rgba(0, 178, 255, 0.1)' : 'rgba(224, 216, 204, 0.25)'} !important;
        }
        .ROLOCATE_SMARTSEARCH_dropdown-content {
            padding: 10px !important;
            max-height: 350px !important;
            overflow-y: auto !important;
            display: block !important;
        }
        .ROLOCATE_SMARTSEARCH_content-text {
            color: ${isDarkMode() ? 'white' : 'black'} !important;
            font-size: 16px !important;
            text-align: center !important;
        }
        .ROLOCATE_SMARTSEARCH_content-text strong {
            color: ${isDarkMode() ? '#00b2ff' : '#8a7e6d'} !important;
        }
        .navbar-left.navbar-search {
            z-index: 1001 !important;
            position: relative !important;
        }
        .ROLOCATE_SMARTSEARCH_game-card-container {
            position: relative;
            margin: 6px 0;
        }
        .ROLOCATE_SMARTSEARCH_game-card-link {
            display: block;
            text-decoration: none;
            color: inherit;
        }
        .ROLOCATE_SMARTSEARCH_game-card {
            display: flex;
            align-items: center;
            padding: 8px;
            background-color: ${isDarkMode() ? '#1e2025' : '#C1B19A'} !important;
            border-radius: 8px;
            transition: background-color 0.2s ease;
        }
        .ROLOCATE_SMARTSEARCH_game-card:hover {
            background-color: ${isDarkMode() ? '#2c2f36' : '#b3a694'} !important;
        }
        .ROLOCATE_SMARTSEARCH_thumbnail-loading {
            width: 50px;
            height: 50px;
            border-radius: 4px;
            margin-right: 10px;
            background-color: #2c2f36;
            position: relative;
            overflow: hidden;
        }
        .ROLOCATE_SMARTSEARCH_thumbnail-loading::after {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
            animation: loading 1.5s infinite;
        }
        @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        .ROLOCATE_SMARTSEARCH_game-thumbnail {
            width: 50px;
            height: 50px;
            border-radius: 4px;
            margin-right: 10px;
            object-fit: cover;
        }
        .ROLOCATE_SMARTSEARCH_game-info {
            flex: 1;
            overflow: hidden;
            padding-right: 90px !important;
        }
        .ROLOCATE_SMARTSEARCH_quicklaunch-button {
            position: absolute;
            right: 54px;
            top: 50%;
            transform: translateY(-50%);
            width: 36px;
            height: 36px;
            border-radius: 6px;
            background: rgba(93, 120, 255, 0.2);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            z-index: 2;
            color: #5d78ff;
        }
        .ROLOCATE_SMARTSEARCH_quicklaunch-button:hover {
            background: rgba(93, 120, 255, 0.3);
            transform: translateY(-50%) scale(1.05);
        }
        .ROLOCATE_SMARTSEARCH_quicklaunch-button.added {
            background: rgba(76, 175, 80, 0.2);
            color: #4CAF50;
        }
        .ROLOCATE_SMARTSEARCH_quicklaunch-button.added:hover {
            background: rgba(244, 67, 54, 0.3);
            color: #f44336;
        }
        .ROLOCATE_SMARTSEARCH_quicklaunch-button svg {
            width: 20px;
            height: 20px;
        }
        .ROLOCATE_SMARTSEARCH_quicklaunch-button .x-mark {
            display: none;
            position: absolute;
        }
        .ROLOCATE_SMARTSEARCH_quicklaunch-button .checkmark {
            display: block;
        }
        .ROLOCATE_SMARTSEARCH_quicklaunch-button.added:hover .checkmark {
            display: none;
        }
        .ROLOCATE_SMARTSEARCH_quicklaunch-button.added:hover .x-mark {
            display: block;
        }
        .ROLOCATE_SMARTSEARCH_quicklaunch-button.disabled,
        .ROLOCATE_SMARTSEARCH_quicklaunch-button:disabled {
            background: rgba(128, 128, 128, 0.2);
            color: #6a6e7d;
            opacity: 0.5;
        }
        .ROLOCATE_SMARTSEARCH_quicklaunch-button.disabled:hover,
        .ROLOCATE_SMARTSEARCH_quicklaunch-button:disabled:hover {
            background: rgba(128, 128, 128, 0.2);
            transform: translateY(-50%) scale(1.05);
            color: #6a6e7d;
        }
        .ROLOCATE_SMARTSEARCH_quicklaunch-button.disabled .checkmark,
        .ROLOCATE_SMARTSEARCH_quicklaunch-button:disabled .checkmark {
            display: block;
        }
        .ROLOCATE_SMARTSEARCH_quicklaunch-button.disabled .x-mark,
        .ROLOCATE_SMARTSEARCH_quicklaunch-button:disabled .x-mark {
            display: none;
        }
        .ROLOCATE_SMARTSEARCH_game-name {
            font-size: 16px;
            color: #ffffff;
            margin: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: calc(100% - 40px);
        }
        .ROLOCATE_SMARTSEARCH_game-stats {
            font-size: 16px;
            color: #8a8d93;
            margin: 2px 0 0 0;
        }
        .ROLOCATE_SMARTSEARCH_thumbs-up {
            color: #4caf50;
        }
        .ROLOCATE_SMARTSEARCH_thumbs-down {
            color: #f44336;
        }
        .ROLOCATE_SMARTSEARCH_play-button {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            width: 36px;
            height: 36px;
            border-radius: 6px;
            background: rgba(76, 175, 80, 0.2);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            z-index: 2;
        }
        .ROLOCATE_SMARTSEARCH_play-button:hover {
            background: rgba(76, 175, 80, 0.3);
            transform: translateY(-50%) scale(1.05);
        }
        .ROLOCATE_SMARTSEARCH_play-button svg {
            width: 18px;
            height: 18px;
        }
        .ROLOCATE_SMARTSEARCH_user-card-link {
            display: block;
            text-decoration: none;
            color: inherit;
        }
        .ROLOCATE_SMARTSEARCH_user-card {
            display: flex;
            align-items: center;
            padding: 8px;
            margin: 6px 0;
            background-color: ${isDarkMode() ? '#1e2025' : '#C1B19A'} !important;
            border-radius: 8px;
            transition: background-color 0.2s ease;
        }
        .ROLOCATE_SMARTSEARCH_user-card:hover {
            background-color: ${isDarkMode() ? '#2c2f36' : '#b3a694'} !important;
        }
        .ROLOCATE_SMARTSEARCH_user-thumbnail {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            margin-right: 12px;
            object-fit: cover;
        }
        .ROLOCATE_SMARTSEARCH_user-info {
            flex: 1;
            overflow: hidden;
        }
        .ROLOCATE_SMARTSEARCH_user-display-name {
            font-size: 16px;
            font-weight: 500;
            color: #ffffff;
            margin: 0 0 2px 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .ROLOCATE_SMARTSEARCH_user-username {
            font-size: 16px;
            color: #8a8d93;
            margin: 0;
            display: flex;
            align-items: center;
        }
        .ROLOCATE_SMARTSEARCH_user-stats {
            font-size: 14px;
            color: #6d717a;
            margin: 4px 0 0 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .ROLOCATE_SMARTSEARCH_stat-item {
            color: #8a8d93;
        }
        .ROLOCATE_SMARTSEARCH_stats-loading {
            color: #6d717a;
            font-style: italic;
            font-size: 13px;
        }
        .ROLOCATE_SMARTSEARCH_group-card-link {
            display: block;
            text-decoration: none;
            color: inherit;
        }
        .ROLOCATE_SMARTSEARCH_group-card {
            display: flex;
            align-items: center;
            padding: 8px;
            margin: 6px 0;
            background-color: ${isDarkMode() ? '#1e2025' : '#C1B19A'} !important;
            border-radius: 8px;
            transition: background-color 0.2s ease;
        }
        .ROLOCATE_SMARTSEARCH_group-card:hover {
            background-color: ${isDarkMode() ? '#2c2f36' : '#b3a694'} !important;
        }
        .ROLOCATE_SMARTSEARCH_group-thumbnail {
            width: 50px;
            height: 50px;
            border-radius: 4px;
            margin-right: 12px;
            object-fit: cover;
        }
        .ROLOCATE_SMARTSEARCH_group-info {
            flex: 1;
            overflow: hidden;
        }
        .ROLOCATE_SMARTSEARCH_group-name {
            font-size: 16px;
            font-weight: 500;
            color: #ffffff;
            margin: 0 0 4px 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .ROLOCATE_SMARTSEARCH_group-members {
            font-size: 16px;
            color: #8a8d93;
            margin: 0 0 2px 0;
        }
        .ROLOCATE_SMARTSEARCH_group-created {
            font-size: 16px;
            color: #6d717a;
            margin: 0;
        }
        .ROLOCATE_SMARTSEARCH_catalog-card-link {
            display: block;
            text-decoration: none;
            color: inherit;
        }
        .ROLOCATE_SMARTSEARCH_catalog-card {
            display: flex;
            align-items: center;
            padding: 8px;
            margin: 6px 0;
            background-color: ${isDarkMode() ? '#1e2025' : '#C1B19A'} !important;
            border-radius: 8px;
            transition: background-color 0.2s ease;
        }
        .ROLOCATE_SMARTSEARCH_catalog-card:hover {
            background-color: ${isDarkMode() ? '#2c2f36' : '#b3a694'} !important;
        }
        .ROLOCATE_SMARTSEARCH_catalog-thumbnail {
            width: 50px;
            height: 50px;
            border-radius: 4px;
            margin-right: 12px;
            object-fit: cover;
        }
        .ROLOCATE_SMARTSEARCH_catalog-info {
            flex: 1;
            overflow: hidden;
        }
        .ROLOCATE_SMARTSEARCH_catalog-name {
            font-size: 16px;
            font-weight: 500;
            color: #ffffff;
            margin: 0 0 4px 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .ROLOCATE_SMARTSEARCH_catalog-price {
            font-size: 16px;
            margin: 0 0 2px 0;
        }
        .ROLOCATE_SMARTSEARCH_catalog-creator {
            font-size: 16px;
            color: #6d717a;
            margin: 0;
        }
        .ROLOCATE_SMARTSEARCH_loading,
        .ROLOCATE_SMARTSEARCH_no-results,
        .ROLOCATE_SMARTSEARCH_error {
            text-align: center;
            color: #8a8d93;
            padding: 20px;
            font-size: 16px;
        }
        .ROLOCATE_SMARTSEARCH_friend-badge {
            display: inline-block;
            background-color: #6b7280;
            color: #ffffff;
            font-size: 14px;
            font-weight: 500;
            padding: 2px 6px;
            border-radius: 4px;
            margin-left: 8px;
            vertical-align: middle;
            line-height: 1.2;
            letter-spacing: 0.025em;
            transform: translateY(-1px);
            border: 1px solid #d1d5db;
        }
        .ROLOCATE_SMARTSEARCH_banned-badge {
            display: inline-block;
            background-color: #3d1a1a;
            color: #cd6e6e;
            font-size: 14px;
            font-weight: 500;
            padding: 2px 6px;
            border-radius: 4px;
            margin-left: 8px;
            vertical-align: middle;
            line-height: 1.2;
            letter-spacing: 0.025em;
            transform: translateY(-1px);
            border: 1px solid #7a3535;
        }
        `;
        document.head.appendChild(style);
        ConsoleLogEnabled('Enhanced search bar with friend integration added successfully!');

        const urlParams = new URLSearchParams(window.location.search);
        const keywordParam = urlParams.get('keyword') || urlParams.get('Keyword');
        if (keywordParam) {
            searchInput.value = decodeURIComponent(keywordParam);
            if (window.location.href.includes('/search/users')) setActiveTab('users');
            else if (window.location.href.includes('/search/communities')) setActiveTab('groups');
            else if (window.location.href.includes('/catalog')) setActiveTab('catalog');
            else setActiveTab('games');
        }

        function setActiveTab(tabKey) {
            tabButtons.forEach(btn => {
                if (btn.dataset.tab === tabKey) {
                    btn.classList.add('ROLOCATE_SMARTSEARCH_active');
                    if (btn.textContent === "Games") contentArea.innerHTML = `<div class="ROLOCATE_SMARTSEARCH_content-text">Quickly search for <strong>games</strong> above!</div>`;
                    else if (btn.textContent === "Users") contentArea.innerHTML = `<div class="ROLOCATE_SMARTSEARCH_content-text">Instantly find the <strong>user</strong> you're looking for!</div>`;
                    else if (btn.textContent === "Groups") contentArea.innerHTML = `<div class="ROLOCATE_SMARTSEARCH_content-text">Search for <strong>groups</strong> rapidly.</div>`;
                    else if (btn.textContent === "Catalog") contentArea.innerHTML = `<div class="ROLOCATE_SMARTSEARCH_content-text">Browse the <strong>catalog</strong> for items!</div>`;
                } else btn.classList.remove('ROLOCATE_SMARTSEARCH_active');
            });
        }
        return true;
    }
/*******************************************************
    name of function: quicklaunchgamesfunction
    description: adds quick launch
    *******************************************************/
    function quicklaunchgamesfunction() {
        if (!/^https?:\/\/(www\.)?roblox\.com(\/[a-z]{2})?\/home\/?$/i.test(window.location.href)) return;
        if (localStorage.getItem('ROLOCATE_quicklaunchgames') !== 'true') return;

        const observer = new MutationObserver((mutations, obs) => {
            const friendsSection = document.querySelector('.friend-carousel-container');
            const friendTiles = document.querySelectorAll('.friends-carousel-tile');

            if (friendsSection && friendTiles.length > 1) {
                obs.disconnect();

                const newGamesContainer = document.createElement('div');
                newGamesContainer.className = 'ROLOCATE_QUICKLAUNCHGAMES_new-games-container';
                newGamesContainer.innerHTML = `
                    <div class="container-header people-list-header">
                        <div class="ROLOCATE_QUICKLAUNCHGAMES_header-content">
                            <div class="ROLOCATE_QUICKLAUNCHGAMES_title">Quick Launch Games</div>
                            <div class="ROLOCATE_QUICKLAUNCHGAMES_subtitle">Drag to reorder • Click to play</div>
                        </div>
                    </div>
                    <div class="ROLOCATE_QUICKLAUNCHGAMES_game-grid-container">
                        <div class="ROLOCATE_QUICKLAUNCHGAMES_game-grid">
                            <div class="ROLOCATE_QUICKLAUNCHGAMES_add-tile" id="ROLOCATE_QUICKLAUNCHGAMES_add-button">
                                <div class="ROLOCATE_QUICKLAUNCHGAMES_add-content">
                                    <svg class="ROLOCATE_QUICKLAUNCHGAMES_add-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                    <div class="ROLOCATE_QUICKLAUNCHGAMES_add-text">Add Game</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                const style = document.createElement('style');
                style.textContent = `
                    .ROLOCATE_QUICKLAUNCHGAMES_new-games-container {
                        background: ${isDarkMode() ? '#1a1c23' : '#E0D8CC'};
                        padding: 20px;
                        margin: 16px 0;
                        margin-bottom: 32px;
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                        border-radius: 12px;
                        border: 1px solid #2a2a30;
                    }

                    .container-header.people-list-header {
                        margin-bottom: 18px;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_header-content {
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_title {
                        font-size: 22px !important;
                        font-weight: 700 !important;
                        color: #f7f8fa !important;
                        margin: 0 !important;
                        letter-spacing: -0.3px !important;
                        background: linear-gradient(to right, #8a9cff, #5d78ff) !important;
                        -webkit-background-clip: text !important;
                        -webkit-text-fill-color: transparent !important;
                        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_subtitle {
                        font-size: 12px !important;
                        color: #a0a5b1 !important;
                        font-weight: 500 !important;
                        letter-spacing: 0.2px !important;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_game-grid-container {
                        margin-top: 16px;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_game-grid {
                        display: flex;
                        gap: 20px;
                        overflow-x: auto;
                        padding-bottom: 12px;
                        scrollbar-width: thin;
                        scrollbar-color: #5d78ff #2d2f36;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_game-grid::-webkit-scrollbar {
                        height: 6px;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_game-grid::-webkit-scrollbar-track {
                        background: #23252d;
                        border-radius: 3px;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_game-grid::-webkit-scrollbar-thumb {
                        background: linear-gradient(to right, #5d78ff, #8a9cff);
                        border-radius: 3px;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_game-grid::-webkit-scrollbar-thumb:hover {
                        background: linear-gradient(to right, #6d85ff, #9aabff);
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_add-tile {
                        flex: 0 0 auto;
                        width: 170px;
                        height: 240px;
                        background: ${isDarkMode() ? 'linear-gradient(145deg, #23252d, #1e2028)' : '#C1B19A'};
                        border-radius: 14px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                        position: relative;
                        overflow: hidden;
                        border: 1px solid rgba(255, 255, 255, 0.05);
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_add-tile::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: linear-gradient(135deg, rgba(93, 120, 255, 0.1), rgba(138, 156, 255, 0.05));
                        opacity: 0;
                        transition: opacity 0.3s ease;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_add-tile:hover {
                        transform: translateY(4px) scale(1.03);
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_add-tile:hover::before {
                        opacity: 1;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_add-content {
                        text-align: center;
                        color: #8b8d94;
                        z-index: 1;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 12px;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_add-icon {
                        width: 32px;
                        height: 32px;
                        stroke-width: 2;
                        color: #5d78ff;
                        transition: all 0.3s ease;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_add-tile:hover .ROLOCATE_QUICKLAUNCHGAMES_add-icon {
                        color: #8a9cff;
                        transform: scale(1.2) rotate(90deg);
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_add-text {
                        font-size: 15px;
                        font-weight: 600;
                        color: ${isDarkMode() ? '#d0d4e0' : 'black'};
                        letter-spacing: 0.3px;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_game-tile {
                        flex: 0 0 auto;
                        width: 170px;
                        background: ${isDarkMode() ? 'linear-gradient(145deg, #23252d, #1e2028)' : '#C1B19A'};
                        border-radius: 14px;
                        overflow: hidden;
                        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease;
                        cursor: grab;
                        position: relative;
                        border: 1px solid rgba(255, 255, 255, 0.05);
                        animation: tileAppear 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_game-tile:hover {
                        transform: translateY(-7px) scale(1.04);
                        z-index: 10;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_game-tile .thumbnail-container {
                        width: 100%;
                        height: 150px;
                        display: block;
                        position: relative;
                        overflow: hidden;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_game-tile img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        transition: transform 0.6s ease;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_game-tile:hover img {
                        transform: scale(1.12);
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_game-name {
                        padding: 14px 16px;
                        font-size: 14px;
                        font-weight: 600;
                        color: ${isDarkMode() ? '#f0f2f6' : 'black'};
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        background: transparent;
                        position: relative;
                        z-index: 1;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_game-info {
                        padding: 10px 16px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: ${isDarkMode() ? 'rgba(28, 30, 38, 0.85);' : '#C1B19A'};
                        position: relative;
                        border-top: 1px solid rgba(255, 255, 255, 0.05);
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_game-stat {
                        display: flex;
                        align-items: center;
                        font-size: 12px;
                        color: ${isDarkMode() ? '#b8b9bf' : 'black'};
                        gap: 4px;
                        font-weight: 500;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_player-count::before {
                        content: "👤";
                        margin-right: 4px;
                        filter: drop-shadow(0 1px 1px rgba(0,0,0,0.3));
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_like-ratio {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_like-ratio .thumb {
                        font-size: 12px;
                        filter: drop-shadow(0 1px 1px rgba(0,0,0,0.3));
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_game-tile.dragging {
                        border: 2px dashed #5d78ff !important;
                        background: rgba(93, 120, 255, 0.1) !important;
                        transform: scale(0.95);
                        cursor: grabbing;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_game-tile.drag-over {
                        border: 1px solid rgba(255, 255, 255, 0.05);
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_remove-button {
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        width: 25px;
                        height: 25px;
                        background: ${isDarkMode() ? 'rgba(20, 22, 30, 0.85);' : '#C1B19A'};
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        opacity: 0;
                        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                        z-index: 2;
                        border: 1px solid rgba(255,255,255,0.1);
                        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_remove-button::before,
                    .ROLOCATE_QUICKLAUNCHGAMES_remove-button::after {
                        content: '';
                        position: absolute;
                        width: 14px;
                        height: 2px;
                        background: #f0f2f6;
                        border-radius: 1px;
                        transition: all 0.2s ease;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_remove-button::before {
                        transform: rotate(45deg);
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_remove-button::after {
                        transform: rotate(-45deg);
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_remove-button:hover {
                        background: rgba(255, 75, 66, 0.95);
                        transform: rotate(90deg) scale(1.1);
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_remove-button:hover::before,
                    .ROLOCATE_QUICKLAUNCHGAMES_remove-button:hover::after {
                        background: white;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_game-tile:hover .ROLOCATE_QUICKLAUNCHGAMES_remove-button {
                        opacity: 1;
                    }

                    @keyframes tileAppear {
                        0% { transform: translateY(10px) scale(0.95); opacity: 0; }
                        100% { transform: translateY(0) scale(1); opacity: 1; }
                    }

                    @keyframes tileRemove {
                        0% { transform: translateY(0) scale(1); opacity: 1; }
                        50% { transform: translateY(-20px) scale(0.9); opacity: 0.5; }
                        100% { transform: translateY(40px) scale(0.8); opacity: 0; }
                    }

                    @keyframes moveTile {
                        0% { transform: translateY(0); }
                        50% { transform: translateY(-8px); }
                        100% { transform: translateY(0); }
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_game-tile.removing {
                        animation: tileRemove 0.4s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards;
                        pointer-events: none;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_game-tile.moving {
                        animation: moveTile 0.4s ease;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_popup-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.3);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 10000;
                        opacity: 0;
                        animation: fadeIn 0.3s ease forwards;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_popup {
                        background: linear-gradient(to bottom, #1f2128, #1a1c23);
                        border-radius: 18px;
                        padding: 32px;
                        width: 440px;
                        max-width: 90vw;
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        transform: scale(0.9);
                        animation: popupIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                        position: relative;
                        overflow: hidden;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_popup::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 4px;
                        background: linear-gradient(to right, #5d78ff, #8a9cff);
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_popup h3 {
                        color: #f7f8fa;
                        font-size: 22px;
                        font-weight: 700;
                        margin: 0 0 24px 0;
                        text-align: center;
                        letter-spacing: -0.3px;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_popup label {
                        color: #a0a5b1;
                        font-size: 15px;
                        font-weight: 500;
                        display: block;
                        margin-bottom: 10px;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_popup input {
                        width: 100%;
                        padding: 15px;
                        background: rgba(40, 42, 50, 0.6);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 12px;
                        color: #f7f8fa;
                        font-size: 15px;
                        margin-bottom: 28px;
                        outline: none;
                        transition: border-color 0.3s ease, box-shadow 0.3s ease;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_popup input::placeholder {
                        color: #6a6e7d;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_popup input:focus {
                        border-color: #5d78ff;
                        box-shadow: 0 0 0 4px rgba(93, 120, 255, 0.25);
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_popup-buttons {
                        display: flex;
                        gap: 16px;
                        justify-content: flex-end;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_popup-button {
                        padding: 14px 28px;
                        border: none;
                        border-radius: 12px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                        letter-spacing: 0.3px;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_popup-button.cancel {
                        background: rgba(60, 64, 78, 0.5);
                        color: #d0d4e0;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_popup-button.cancel:hover {
                        background: rgba(80, 84, 98, 0.7);
                        transform: translateY(-3px);
                        box-shadow: 0 6px 12px rgba(0,0,0,0.25);
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_popup-button.confirm {
                        background: linear-gradient(135deg, #5d78ff, #8a9cff);
                        color: white;
                        box-shadow: 0 6px 16px rgba(93, 120, 255, 0.4);
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_popup-button.confirm:hover {
                        background: linear-gradient(135deg, #6d85ff, #9aabff);
                        transform: translateY(-3px);
                        box-shadow: 0 8px 20px rgba(93, 120, 255, 0.5);
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_popup-button:active {
                        transform: translateY(1px);
                    }

                    @keyframes fadeIn {
                        to { opacity: 1; }
                    }

                    @keyframes popupIn {
                        to { transform: scale(1); opacity: 1; }
                    }

                    @keyframes popupFadeOut {
                        0% { transform: scale(1); opacity: 1; }
                        100% { transform: scale(0.95); opacity: 0; }
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_popup.fade-out {
                        animation: popupFadeOut 0.3s ease forwards;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_add-tile:active {
                        transform: translateY(2px) scale(0.97) !important;
                    }

                    .ROLOCATE_QUICKLAUNCHGAMES_add-tile.clicked {
                        animation: buttonClick 0.3s ease;
                    }

                    @keyframes buttonClick {
                        0% { transform: scale(1); }
                        50% { transform: scale(0.95); }
                        100% { transform: scale(1); }
                    }
                `;
                document.head.appendChild(style);

                friendsSection.parentNode.insertBefore(newGamesContainer, friendsSection.nextSibling);

                function formatNumber(num) {
                    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
                    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
                    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                }

                function saveCurrentOrder() {
                    const tiles = document.querySelectorAll('.ROLOCATE_QUICKLAUNCHGAMES_game-tile');
                    const order = Array.from(tiles).map(tile => tile.dataset.gameId);
                    localStorage.setItem('ROLOCATE_quicklaunch_games_storage', JSON.stringify(order));
                }

                // voteData param added so loadSavedGames can pass in pre-fetched votes and avoid a double API call
                function addGameTile(gameId, gameDetails = null, voteData = null) {
                    const gameGrid = document.querySelector('.ROLOCATE_QUICKLAUNCHGAMES_game-grid');
                    if (!gameGrid) return;

                    const gameTile = document.createElement('div');
                    gameTile.className = 'ROLOCATE_QUICKLAUNCHGAMES_game-tile';
                    gameTile.dataset.gameId = gameId;

                    gameTile.innerHTML = `
                        <a href="https://www.roblox.com/games/${gameId}#?ROLOCATE_QUICKJOIN" target="_blank">
                            <div class="thumbnail-container">
                                <div style="width:100%;height:100%;background:linear-gradient(135deg,#23252d,#1e2028);display:flex;align-items:center;justify-content:center;">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M4 8H20V16H4V8Z" stroke="#4a4d56" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        <path d="M8 4V8" stroke="#4a4d56" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        <path d="M16 4V8" stroke="#4a4d56" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </div>
                            </div>
                            <div class="ROLOCATE_QUICKLAUNCHGAMES_game-name">Loading...</div>
                            <div class="ROLOCATE_QUICKLAUNCHGAMES_game-info">
                                <div class="ROLOCATE_QUICKLAUNCHGAMES_like-ratio">
                                    <span class="thumb">👍</span> -
                                </div>
                                <div class="ROLOCATE_QUICKLAUNCHGAMES_game-stat ROLOCATE_QUICKLAUNCHGAMES_player-count">-</div>
                            </div>
                        </a>
                        <div class="ROLOCATE_QUICKLAUNCHGAMES_remove-button"></div>
                    `;

                    gameGrid.insertBefore(gameTile, gameGrid.querySelector('.ROLOCATE_QUICKLAUNCHGAMES_add-tile'));

                    // remove button
                    const removeBtn = gameTile.querySelector('.ROLOCATE_QUICKLAUNCHGAMES_remove-button');
                    removeBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        gameTile.classList.add('removing');
                        setTimeout(() => {
                            const games = JSON.parse(localStorage.getItem('ROLOCATE_quicklaunch_games_storage') || '[]');
                            const updatedGames = games.filter(id => id !== gameId);
                            localStorage.setItem('ROLOCATE_quicklaunch_games_storage', JSON.stringify(updatedGames));
                            gameTile.remove();
                        }, 400);
                    });

                    // the drag and drop stuff
                    gameTile.draggable = true;

                    gameTile.addEventListener('dragstart', (e) => {
                        gameTile.classList.add('dragging');
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setDragImage(gameTile, 85, 120); // tells browser to use the actual cards as a dragging thingy
                        e.dataTransfer.setData('text/html', gameTile.innerHTML);
                    });

                    gameTile.addEventListener('dragend', () => {
                        gameTile.classList.remove('dragging');
                        document.querySelectorAll('.ROLOCATE_QUICKLAUNCHGAMES_game-tile').forEach(tile => {
                            tile.classList.remove('drag-over');
                        });
                        saveCurrentOrder();
                    });

                    gameTile.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        const draggingTile = document.querySelector('.dragging');
                        if (draggingTile && draggingTile !== gameTile) {
                            const gameGrid = document.querySelector('.ROLOCATE_QUICKLAUNCHGAMES_game-grid');
                            const bounding = gameTile.getBoundingClientRect();

                            // lets go geometry finally becoming useful.
                            // calcualtes the midpoint
                            const offset = e.clientX - bounding.left;
                            const isPastMidpoint = offset > bounding.width / 2;

                            const allTiles = [...gameGrid.querySelectorAll('.ROLOCATE_QUICKLAUNCHGAMES_game-tile')];
                            const draggingIndex = allTiles.indexOf(draggingTile);
                            const targetIndex = allTiles.indexOf(gameTile);

                            // Only swap if we've actually moved past the center to prevent like a dumb flicker. this took too long to figure out a solution to
                            if (draggingIndex < targetIndex && isPastMidpoint) {
                                gameGrid.insertBefore(draggingTile, gameTile.nextSibling);
                            } else if (draggingIndex > targetIndex && !isPastMidpoint) {
                                gameGrid.insertBefore(draggingTile, gameTile);
                            }
                        }
                    });

                    gameTile.addEventListener('dragleave', () => {
                        gameTile.classList.remove('drag-over');
                    });

                    gameTile.addEventListener('drop', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        gameTile.classList.remove('drag-over');
                    });

                    // load details of the game
                    (async () => {
                        try {
                            const universeId = await getUniverseIdFromPlaceId(gameId);

                            // fetch icon, details, and votes in parallel — only call what wasnt pre-fetched
                            const [iconUrl, details, votes] = await Promise.all([
                                getGameIconFromUniverseId(universeId),
                                gameDetails || getGameDetailsBatch(universeId),
                                voteData || getGameVotesFromUniverseId(universeId)
                            ]);

                            const thumbContainer = gameTile.querySelector('.thumbnail-container');
                            thumbContainer.innerHTML = `<img src="${iconUrl}" alt="${details?.name || 'Game'}" onerror="this.src='https://via.placeholder.com/150x150?text=No+Image'">`;

                            const gameName = gameTile.querySelector('.ROLOCATE_QUICKLAUNCHGAMES_game-name');
                            gameName.textContent = details?.name || 'Unknown Game';

                            const playerCount = gameTile.querySelector('.ROLOCATE_QUICKLAUNCHGAMES_player-count');
                            const likeRatio = gameTile.querySelector('.ROLOCATE_QUICKLAUNCHGAMES_like-ratio');

                            playerCount.textContent = formatNumber(details?.playing || 0);

                            // calculate like ratio from real upvote/downvote data
                            const upVotes = votes?.upVotes || 0;
                            const downVotes = votes?.downVotes || 0;
                            const total = upVotes + downVotes;
                            const ratio = total > 0 ? Math.floor((upVotes / total) * 100) : 0; // roblox rounds down for some reason idk why
                            likeRatio.innerHTML = `<span class="thumb">👍</span> ${ratio}%`;

                        } catch (err) {
                            ConsoleLogEnabled('Game load err:', err);
                            const gameName = gameTile.querySelector('.ROLOCATE_QUICKLAUNCHGAMES_game-name');
                            gameName.textContent = 'Load Failed';
                        }
                    })();
                }

                function showAddGamePopup() {
                    const existingGames = document.querySelectorAll('.ROLOCATE_QUICKLAUNCHGAMES_game-tile').length;
                    if (existingGames >= 10) {
                        notifications('Maximum 10 games allowed', 'error', '⚠️', '4000');
                        return;
                    }

                    const addButton = document.getElementById('ROLOCATE_QUICKLAUNCHGAMES_add-button');
                    addButton.classList.add('clicked');
                    setTimeout(() => addButton.classList.remove('clicked'), 300);

                    const overlay = document.createElement('div');
                    overlay.className = 'ROLOCATE_QUICKLAUNCHGAMES_popup-overlay';
                    overlay.innerHTML = `
                        <div class="ROLOCATE_QUICKLAUNCHGAMES_popup">
                            <h3>Add New Game</h3>
                            <label for="gameIdInput">Game ID:</label>
                            <input type="text" id="gameIdInput" placeholder="Enter game ID | RoLocate by Oqarshi">
                            <small style="display:block; margin-top:4px; color:#aaa;">
                              Example: roblox.com/games/<b style="color:#4da6ff;">17625359962</b>/RIVALS
                              <br>
                              OR
                              <br>
                              Use SmartSearch to add a new game
                            </small>
                            <div class="ROLOCATE_QUICKLAUNCHGAMES_popup-buttons" style="margin-top:12px;">
                                <button class="ROLOCATE_QUICKLAUNCHGAMES_popup-button cancel">Cancel</button>
                                <button class="ROLOCATE_QUICKLAUNCHGAMES_popup-button confirm">Add Game</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(overlay);

                    setTimeout(() => document.getElementById('gameIdInput').focus(), 100);

                    const cancelBtn = overlay.querySelector('.cancel');
                    const confirmBtn = overlay.querySelector('.confirm');
                    const input = document.getElementById('gameIdInput');

                    cancelBtn.onclick = () => {
                        overlay.querySelector('.ROLOCATE_QUICKLAUNCHGAMES_popup').classList.add('fade-out');
                        setTimeout(() => overlay.remove(), 300);
                    };

                    confirmBtn.onclick = async () => {
                        const gameId = input.value.trim();
                        if (!gameId) {
                            notifications('Please enter a game ID', 'error', '⚠️', '4000');
                            return;
                        }
                        if (!/^\d+$/.test(gameId)) {
                            notifications('Game ID must be numeric', 'error', '⚠️', '4000');
                            return;
                        }

                        const games = JSON.parse(localStorage.getItem('ROLOCATE_quicklaunch_games_storage') || '[]');
                        if (games.includes(gameId)) {
                            notifications('Game already added!', 'error', '⚠️', '4000');
                            return;
                        }

                        confirmBtn.textContent = 'Adding...';
                        confirmBtn.disabled = true;

                        try {
                            const universeId = await getUniverseIdFromPlaceId(gameId);

                            // fetch details and votes in parallel before closing the popup
                            const [gameDetails, voteData] = await Promise.all([
                                getGameDetailsBatch(universeId),
                                getGameVotesFromUniverseId(universeId)
                            ]);

                            games.push(gameId);
                            localStorage.setItem('ROLOCATE_quicklaunch_games_storage', JSON.stringify(games));
                            addGameTile(gameId, gameDetails, voteData);

                            overlay.querySelector('.ROLOCATE_QUICKLAUNCHGAMES_popup').classList.add('fade-out');
                            setTimeout(() => overlay.remove(), 300);
                        } catch (error) {
                            notifications('Error: ' + (error.message || 'Failed to add game'), 'error', '⚠️', '4000');
                            confirmBtn.textContent = 'Add Game';
                            confirmBtn.disabled = false;
                        }
                    };
                }

                async function loadSavedGames() {
                    const savedGames = JSON.parse(localStorage.getItem('ROLOCATE_quicklaunch_games_storage') || '[]');
                    if (savedGames.length === 0) return;

                    // resolve all placeIds -> universeIds in parallel
                    const universeIds = await Promise.all(savedGames.map(id => getUniverseIdFromPlaceId(id)));

                    // single batched request for all game details and votes
                    const [detailsMap, votesMap] = await Promise.all([
                        getGameDetailsBatch(universeIds),
                        getGameVotesFromUniverseId(universeIds)
                    ]);

                    // add tiles with pre-fetched details and votes so addGameTile never has to re-fetch
                    savedGames.forEach((gameId, i) => {
                        const universeId = universeIds[i];
                        addGameTile(gameId, detailsMap[universeId] || null, votesMap[universeId] || null);
                    });
                }

                // add button
                const addButton = document.getElementById('ROLOCATE_QUICKLAUNCHGAMES_add-button');
                addButton.addEventListener('click', showAddGamePopup);

                setTimeout(loadSavedGames, 100);

                // listen for updates from SmartSearch and then update quicklaunch
                window.addEventListener('quicklaunch-update', function(e) {
                    const { placeId, action } = e.detail;

                    if (action === 'add') {
                        // check if already exists
                        const existingTile = document.querySelector(`.ROLOCATE_QUICKLAUNCHGAMES_game-tile[data-game-id="${placeId}"]`);
                        if (!existingTile) {
                            addGameTile(placeId);
                        }
                    } else if (action === 'remove') {
                        // find and remove the tile
                        const tileToRemove = document.querySelector(`.ROLOCATE_QUICKLAUNCHGAMES_game-tile[data-game-id="${placeId}"]`);
                        if (tileToRemove) {
                            tileToRemove.classList.add('removing');
                            setTimeout(() => {
                                tileToRemove.remove();
                            }, 400);
                        }
                    }
                });
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
            observer.disconnect();
            if (!document.querySelector('.ROLOCATE_QUICKLAUNCHGAMES_new-games-container')) {
                quicklaunchgamesfunction();
            }
        }, 5000);
    }

/*******************************************************
    name of function: betterfriends
    description: betterfriends and yea
    *******************************************************/
    // WARNING: Do not republish this script. Licensed for personal use only.
    function betterfriends() {

        // out if we're not on the home page
        if (!/^https?:\/\/(www\.)?roblox\.com(\/[a-z]{2})?\/home\/?$/i.test(window.location.href)) return;
        // also out if the user didn't enable this feature
        if (localStorage.getItem('ROLOCATE_betterfriends') !== 'true') {
            return;
        }

        // all the observers and flags we need to track
        let dropdownObserver = null;
        let avatarObserver = null;
        let mainObserver = null;
        let observerTimeout = null;
        let stylesAdded = false;
        let bestFriendsButtonObserver = null;
        let localAvatarCache = {};

        // reverse compatability
        const toAvatarMap = (arr) => {
            const map = {};
            (arr || []).forEach(entry => {
                if (entry.targetId && entry.imageUrl) map[entry.targetId] = entry.imageUrl;
            });
            return map;
        };

        // these get populated once we fetch presence data so dropdowns can read them later
        let sharedOnlineStatusMap = {};
        let sharedFriendsDataMap = {};

        // tooltip stuff, not really used much but keeping it around
        let activeTooltip = null;
        let tooltipHideTimeout = null;

        // just a bunch of class name strings so we dont have to type them out everywhere
        const CLASSES = {
            STYLES_ID: 'ROLOCATE_friend-status-styles',
            STATUS_ONLINE: 'ROLOCATE_friend-status-online',
            STATUS_GAME: 'ROLOCATE_friend-status-game',
            STATUS_OFFLINE: 'ROLOCATE_friend-status-offline',
            STATUS_OTHER: 'ROLOCATE_friend-status-other',
            DROPDOWN_STYLED: 'ROLOCATE_dropdown-styled',
            TILE_STYLED: 'ROLOCATE_tile-styled',
            BEST_FRIENDS_BUTTON: 'ROLOCATE_best-friends-button',
            BEST_FRIEND_STAR: 'ROLOCATE-best-friend-star',
            STATUS_TOOLTIP: 'ROLOCATE_status-tooltip'
        };

        // injects all our css into the page, only runs once
        const addStatusStyles = () => {
            if (stylesAdded || document.getElementById(CLASSES.STYLES_ID)) return;

            const styleSheet = document.createElement('style');
            styleSheet.id = CLASSES.STYLES_ID;
            styleSheet.textContent = `
            .${CLASSES.STATUS_ONLINE},
            .${CLASSES.STATUS_GAME},
            .${CLASSES.STATUS_OFFLINE},
            .${CLASSES.STATUS_OTHER} {
                border: 4px solid !important;
                border-radius: 50% !important;
            }
            .${CLASSES.STATUS_ONLINE} { border-color: #00a2ff !important; }
            .${CLASSES.STATUS_GAME}   { border-color: #02b757 !important; }
            .${CLASSES.STATUS_OFFLINE}{ border-color: #6b7280 !important; }
            .${CLASSES.STATUS_OTHER}  { border-color: #f68802 !important; }

            .friend-tile-dropdown {
                background: ${isDarkMode() ? '#1a1c23' : '#C1B19A'} !important;
                border: 1px solid rgba(148, 163, 184, 0.2) !important;
                border-radius: 8px !important;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
                overflow: hidden !important;
                transition: opacity 0.15s ease, transform 0.15s ease !important;
            }

            .friend-tile-dropdown ul {
                padding: 8px !important;
                margin: 0 !important;
                list-style: none !important;
            }

            .friend-tile-dropdown li {
                margin: 0 !important;
                padding: 0 !important;
            }

            .friend-tile-dropdown-button {
                width: 100% !important;
                padding: 10px 14px !important;
                background: transparent !important;
                border: none !important;
                border-radius: 6px !important;
                color: #e2e8f0 !important;
                font-size: 14px !important;
                font-weight: 500 !important;
                text-align: left !important;
                cursor: pointer !important;
                display: flex !important;
                align-items: center !important;
                gap: 10px !important;
                transition: background-color 0.15s ease !important;
            }

            .friend-tile-dropdown-button:hover {
                background: rgba(37, 99, 235, 0.08) !important;
            }

            .friend-tile-dropdown-button:active {
                background: rgba(37, 99, 235, 0.15) !important;
            }

            .friend-tile-dropdown-button .icon {
                flex-shrink: 0 !important;
            }

            .${CLASSES.BEST_FRIENDS_BUTTON} {
                background: transparent !important;
                border: 1px solid #2563eb !important;
                border-radius: 6px !important;
                color: #3b82f6 !important;
                font-size: 13px !important;
                font-weight: 500 !important;
                padding: 6px 12px !important;
                cursor: pointer !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 6px !important;
                transition: background-color 0.15s ease, border-color 0.15s ease !important;
                margin-left: 12px !important;
                margin-top: -2px !important;
                text-decoration: none !important;
            }

            .${CLASSES.BEST_FRIENDS_BUTTON}:hover {
                background: rgba(37, 99, 235, 0.08) !important;
                border-color: #3b82f6 !important;
            }

            .${CLASSES.BEST_FRIENDS_BUTTON}:active {
                background: rgba(37, 99, 235, 0.15) !important;
            }

            .${CLASSES.BEST_FRIENDS_BUTTON} svg {
                width: 14px !important;
                height: 14px !important;
                flex-shrink: 0 !important;
            }

            /* best friends popup styles */
            .best-friends-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.2s ease-out;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to   { opacity: 1; }
            }
            .best-friends-popup {
                background: linear-gradient(135deg, #111114 0%, #1a1a1d 100%);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 16px;
                width: 90%;
                max-width: 700px;
                max-height: 80vh;
                overflow: hidden;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
                animation: popupSlideIn 0.2s ease-out;
            }
            @keyframes popupSlideIn {
                from { opacity: 0; transform: scale(0.95) translateY(20px); }
                to   { opacity: 1; transform: scale(1)    translateY(0);    }
            }
            .best-friends-popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 24px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            .best-friends-popup-header h3 {
                color: #ffffff;
                margin: 0;
                font-family: "Source Sans Pro", Arial, sans-serif;
                font-size: 20px;
                font-weight: 700;
            }
            .best-friends-close {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: #ffffff;
                font-size: 20px;
                cursor: pointer;
                padding: 8px;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.15s ease;
            }
            .best-friends-close:hover {
                background: rgba(255, 59, 59, 0.2);
                border-color: rgba(255, 59, 59, 0.4);
                transform: rotate(90deg);
            }
            .best-friends-popup-grid {
                padding: 24px;
                max-height: 60vh;
                overflow-y: auto;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 16px;
            }
            .best-friends-popup-item {
                display: flex;
                align-items: center;
                padding: 16px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.15s ease;
                animation: itemSlideIn 0.2s ease-out backwards;
                position: relative;
            }
            @keyframes itemSlideIn {
                from { opacity: 0; transform: translateX(-20px); }
                to   { opacity: 1; transform: translateX(0);     }
            }
            .best-friends-popup-item:hover {
                background: linear-gradient(45deg, rgba(255,255,255,0.1), rgba(255,255,255,0.08));
                border-color: rgba(255, 255, 255, 0.25);
                transform: translateY(-2px) scale(1.01);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
            }
            .best-friend-avatar {
                width: 48px;
                height: 48px;
                border: 2px solid rgba(255, 255, 255, 0.15);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 16px;
                font-size: 20px;
                flex-shrink: 0;
                overflow: hidden;
                transition: all 0.15s ease;
            }
            .best-friend-avatar img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 50%;
            }
            .best-friends-popup-item:hover .best-friend-avatar {
                transform: scale(1.05);
                border-color: rgba(255, 255, 255, 0.3);
            }
            .best-friend-name {
                color: #ffffff;
                font-family: "Source Sans Pro", Arial, sans-serif;
                font-size: 16px;
                font-weight: 600;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                flex-grow: 1;
            }
            .${CLASSES.BEST_FRIEND_STAR} {
                position: absolute;
                top: 8px;
                right: 8px;
                width: 26px;
                height: 26px;
                color: #ffd700;
                fill: currentColor;
                filter: drop-shadow(0 0 8px rgba(255,215,0,0.6)) drop-shadow(0 2px 4px rgba(0,0,0,0.8));
                animation: starGlow 2s ease-in-out infinite alternate;
                opacity: 0;
                transform: scale(0.8);
                transition: opacity 0.3s ease, transform 0.3s ease;
            }
            .${CLASSES.BEST_FRIEND_STAR}.star-visible {
                opacity: 1;
                transform: scale(1);
            }
            .${CLASSES.BEST_FRIEND_STAR}:hover {
                transform: scale(1.1);
                filter: drop-shadow(0 0 12px rgba(255,215,0,0.8)) drop-shadow(0 2px 6px rgba(0,0,0,0.9));
            }
            @keyframes starGlow {
                0%   { filter: drop-shadow(0 0 8px  rgba(255,215,0,0.6)) drop-shadow(0 2px 4px rgba(0,0,0,0.8)); }
                100% { filter: drop-shadow(0 0 15px rgba(255,215,0,0.9)) drop-shadow(0 2px 4px rgba(0,0,0,0.8)); }
            }
            .best-friends-loading {
                display: flex;
                align-items: center;
                color: rgba(255,255,255,0.8);
                font-size: 16px;
                font-family: "Source Sans Pro", Arial, sans-serif;
                font-weight: 500;
            }
            .loading-spinner {
                width: 20px;
                height: 20px;
                border: 3px solid rgba(255,255,255,0.2);
                border-top: 3px solid #ffffff;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
                margin-right: 12px;
            }
            @keyframes spin {
                0%   { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .no-best-friends {
                color: rgba(255,255,255,0.6);
                font-style: italic;
                font-size: 16px;
                font-family: "Source Sans Pro", Arial, sans-serif;
                text-align: center;
                padding: 20px;
            }
            .best-friends-popup-grid::-webkit-scrollbar       { width: 8px; }
            .best-friends-popup-grid::-webkit-scrollbar-track  { background: rgba(255,255,255,0.1); border-radius: 4px; }
            .best-friends-popup-grid::-webkit-scrollbar-thumb  { background: linear-gradient(45deg,#555,#666); border-radius: 4px; }
            .best-friends-popup-grid::-webkit-scrollbar-thumb:hover { background: linear-gradient(45deg,#666,#777); }
            @keyframes fadeOut {
                from { opacity: 1; }
                to   { opacity: 0; }
            }
            .best-friends-search-container {
                border: 2px solid #2563eb;
                border-radius: 8px;
                flex: 1;
                margin: 0 20px;
            }
            .best-friends-search {
                width: 100%;
                padding: 10px 15px;
                background: rgba(255,255,255,0.1);
                border-radius: 8px;
                color: white;
                font-size: 14px;
                outline: none;
            }
        `;
            document.head.appendChild(styleSheet);
            stylesAdded = true;
        };

        // the dropdown that pops up when you hover a best friend tile
        // basically we like make the html but not the css since its already made in the page

        let activeDropdown = null;
        let dropdownHideTimeout = null;

        // kills the current dropdown if there is one
        const removeActiveDropdown = () => {
            if (activeDropdown) {
                activeDropdown.remove();
                activeDropdown = null;
            }
            if (dropdownHideTimeout) {
                clearTimeout(dropdownHideTimeout);
                dropdownHideTimeout = null;
            }
        };

        const showFriendDropdown = async (tile, friendId, displayName) => {
            removeActiveDropdown();

            const status = sharedOnlineStatusMap[friendId] || 'offline';
            const friendData = sharedFriendsDataMap[friendId] || {};

            // need the section to be a positioned ancestor so our absolute dropdown lands in the right spot
            const bestFriendsSection = document.querySelector('.best-friends-section');
            if (!bestFriendsSection) return;
            if (getComputedStyle(bestFriendsSection).position === 'static') bestFriendsSection.style.position = 'relative';

            const dropdownWrapper = document.createElement('div');
            dropdownWrapper.style.cssText = `position: absolute; z-index: 1002; width: 315px;`;

            const dropdown = document.createElement('div');
            dropdown.className = 'friend-tile-dropdown';
            dropdown.setAttribute('data-friend-status', status);

            // keep it alive if the mouse moves onto the dropdown itself
            dropdown.addEventListener('mouseenter', () => {
                if (dropdownHideTimeout) { clearTimeout(dropdownHideTimeout); dropdownHideTimeout = null; }
            });
            dropdown.addEventListener('mouseleave', () => {
                dropdownHideTimeout = setTimeout(removeActiveDropdown, 120);
            });

            // show the in-game card at the top if theyre actually in a game or studio
            if ((status === 'game' || status === 'other') && (friendData.lastLocation || friendData.placeId)) {
                const gameCard = document.createElement('div');
                gameCard.className = 'in-game-friend-card';

                const thumbnailButton = document.createElement('button');
                thumbnailButton.type = 'button';
                thumbnailButton.className = 'friend-tile-non-styled-button';

                const thumbnailSpan = document.createElement('span');
                thumbnailSpan.className = 'thumbnail-2d-container friend-tile-game-card';
                thumbnailSpan.style.cssText = 'background-color: #1a1c23;'; // uggly gray square gone. outline still here bruh i give up

                const thumbnailImg = document.createElement('img');
                thumbnailImg.className = 'game-card-thumb';
                thumbnailImg.src = '';
                thumbnailImg.alt = '';
                thumbnailImg.title = '';

                // fetch the game icon async so it doesnt block the dropdown from showing
                if (friendData.placeId) {
                    (async () => {
                        try {
                            const universeId = await getUniverseIdFromPlaceId(friendData.placeId);
                            if (universeId) {
                                const iconUrl = await getGameIconFromUniverseId(universeId);
                                if (iconUrl) thumbnailImg.src = iconUrl;
                            }
                        } catch (err) {
                            ConsoleLogEnabled('[showFriendDropdown] icon fetch error', err);
                        }
                    })();
                }

                thumbnailSpan.appendChild(thumbnailImg);
                thumbnailButton.appendChild(thumbnailSpan);
                gameCard.appendChild(thumbnailButton);

                const presenceInfo = document.createElement('div');
                presenceInfo.className = 'friend-presence-info';

                const gameNameButton = document.createElement('button');
                gameNameButton.type = 'button';
                gameNameButton.className = 'friend-tile-non-styled-button';
                gameNameButton.textContent = friendData.lastLocation || (status === 'game' ? 'In Game' : 'In Studio');
                presenceInfo.appendChild(gameNameButton);

                // clicking the thumbnail or the game name both open the game page
                const gameUrl = `https://www.roblox.com/games/${friendData.placeId}`;
                thumbnailButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    window.open(gameUrl, '_blank');
                });
                gameNameButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    window.open(gameUrl, '_blank');
                });
                gameNameButton.style.cursor = 'pointer';

                // only show join button if we have everything we need for it to actually work
                // took forever to figure out the string thing btw, passing numbers just broke it cause im dumb
                if (status === 'game' && friendData.rootPlaceId && friendData.gameInstanceId) {
                    const joinButton = document.createElement('button');
                    joinButton.type = 'button';
                    joinButton.className = 'btn-growth-sm btn-full-width';
                    joinButton.textContent = 'Join';
                    joinButton.addEventListener('click', (event) => {
                        event.stopPropagation();
                        JoinServer(String(friendData.rootPlaceId), String(friendData.gameInstanceId));
                    });
                    presenceInfo.appendChild(joinButton);
                }

                gameCard.appendChild(presenceInfo);
                dropdown.appendChild(gameCard);
            }

            // the action buttons at the bottom (chat, view profile)
            const actionList = document.createElement('ul');

            // this is for the view profile button. we find the core script to open the chat also
            const actions = [
                {
                    icon: 'icon-chat-gray', label: `Chat with ${displayName}`, action: () => {
                        runInPageContext((uid) => {
                            window.Roblox?.['core-scripts']?.util?.chat?.startDesktopAndMobileWebChat({ userId: uid });
                        }, [friendId]);
                    }
                },
                { icon: 'icon-viewdetails', label: 'View Profile', href: `https://www.roblox.com/users/${friendId}/profile` }
            ];

            actions.forEach(({ icon, label, href, action }) => {
                const listItem = document.createElement('li');
                const actionButton = document.createElement('button');
                actionButton.type = 'button';
                actionButton.className = 'friend-tile-dropdown-button';

                const iconSpan = document.createElement('span');
                iconSpan.className = icon;
                actionButton.appendChild(iconSpan);
                actionButton.appendChild(document.createTextNode(` ${label}`));

                actionButton.addEventListener('click', () => {
                    if (href) window.open(href, '_blank');
                    else if (action) action();
                    removeActiveDropdown();
                });

                listItem.appendChild(actionButton);
                actionList.appendChild(listItem);
            });

            dropdown.appendChild(actionList);
            dropdownWrapper.appendChild(dropdown);

            // figure out where to place the dropdown so it doesnt fly off screen
            bestFriendsSection.appendChild(dropdownWrapper);

            const dropdownWidth = dropdownWrapper.offsetWidth;
            const dropdownHeight = dropdownWrapper.offsetHeight;
            const DROPDOWN_MARGIN = 6;
            const sectionRect = bestFriendsSection.getBoundingClientRect();
            const tileRect = tile.getBoundingClientRect();

            // default is centered below the tile
            let leftPos = (tileRect.left - sectionRect.left) + (tileRect.width / 2) - (dropdownWidth / 2);
            let topPos = (tileRect.bottom - sectionRect.top) + bestFriendsSection.scrollTop + DROPDOWN_MARGIN;

            // flip it above the tile if it would go off the bottom of the screen
            const dropdownBottomOnScreen = tileRect.bottom + DROPDOWN_MARGIN + dropdownHeight;
            if (dropdownBottomOnScreen > window.innerHeight - DROPDOWN_MARGIN) {
                topPos = (tileRect.top - sectionRect.top) + bestFriendsSection.scrollTop - dropdownHeight - DROPDOWN_MARGIN;
            }

            // clamp so it never pokes out the sides of the section
            leftPos = Math.max(0, Math.min(leftPos, sectionRect.width - dropdownWidth));

            dropdownWrapper.style.top = `${topPos}px`;
            dropdownWrapper.style.left = `${leftPos}px`;

            activeDropdown = dropdownWrapper;
        };

        // wire up hover events on a tile so it shows the dropdown
        const attachTileTooltip = (tile, friendId, displayName) => {
            tile.addEventListener('mouseenter', () => {
                if (dropdownHideTimeout) { clearTimeout(dropdownHideTimeout); dropdownHideTimeout = null; }
                showFriendDropdown(tile, friendId, displayName);
            });

            tile.addEventListener('mouseleave', () => {
                dropdownHideTimeout = setTimeout(removeActiveDropdown, 120);
            });
        };

        // builds the whole best friends section above the normal friends list
        const createBestFriendsSection = () => {
            // dont create it if its already there
            const existingSection = document.querySelector('.best-friends-section');
            if (existingSection) return;

            const friendsContainer = document.querySelector('.friend-carousel-container');
            if (!friendsContainer) return;

            // if you have no best friends set, dont show an empty section so just yea
            const bestFriends = getBestFriends();
            if (bestFriends.size === 0) return;

            const bestFriendsSection = document.createElement('div');
            bestFriendsSection.className = 'best-friends-section';
            bestFriendsSection.style.cssText = `
        background-color: ${isDarkMode() ? '#1a1c23' : '#E0D8CC'};
        border-radius: 12px;
        border: 1px solid ${isDarkMode() ? '#2a2a30' : '#C1B19A'};
        padding: 12px;
        box-sizing: border-box;
        margin: 0 0 16px 0;
    `;

            const headerDiv = document.createElement('div');
            headerDiv.className = 'container-header people-list-header';
            headerDiv.style.cssText = `display: flex; align-items: center; margin-bottom: 12px;`;

            const headerTitle = document.createElement('h2');
            headerTitle.textContent = 'Best Friends';
            headerTitle.style.cssText = `
        color: ${isDarkMode() ? 'white' : 'black'};
        font-size: 18px;
        font-weight: 600;
        margin: 0;
        font-family: "Source Sans Pro", Arial, sans-serif;
    `;

            headerDiv.appendChild(headerTitle);

            const carouselContainer = document.createElement('div');
            carouselContainer.className = 'friends-carousel-container';
            carouselContainer.style.cssText = `background: transparent; border: none; padding: 0; margin: 0;`;

            const carousel = document.createElement('div');
            carousel.className = 'friends-carousel';
            carousel.style.cssText = `display: flex; gap: 12px; overflow-x: auto; padding: 4px;`;

            bestFriendsSection.appendChild(headerDiv);
            carouselContainer.appendChild(carousel);
            bestFriendsSection.appendChild(carouselContainer);

            // insert it right above the normal friends section
            friendsContainer.parentNode.insertBefore(bestFriendsSection, friendsContainer);

            populateBestFriendsSection();
        };

        // what the functiojns name says
        const populateBestFriendsSection = async () => {
            const bestFriendsCarousel = document.querySelector('.best-friends-section .friends-carousel');
            if (!bestFriendsCarousel) return;

            const bestFriends = getBestFriends();
            if (bestFriends.size === 0) return;

            bestFriendsCarousel.innerHTML = '';

            try {
                const currentUserId = getCurrentUserId();
                if (!currentUserId) return;

                const allFriends = await gmFetchFriends(currentUserId);
                if (!allFriends) return;

                const onlineFriends = await fetchOnlineFriends(currentUserId);

                // build the shared status maps so the dropdown can read them later without fetching again
                onlineFriends.forEach(friend => {
                    const presence = friend.userPresence;
                    let status;
                    if (presence.UserPresenceType === 'Online') {
                        status = 'online';
                    } else if (presence.UserPresenceType === 'InGame') {
                        status = 'game';
                    } else {
                        status = 'other';
                    }
                    sharedOnlineStatusMap[friend.id] = status;
                    sharedFriendsDataMap[friend.id] = {
                        lastLocation:   presence.lastLocation   || null,
                        placeId:        presence.placeId        || null,
                        rootPlaceId:    presence.rootPlaceId    || null,
                        gameInstanceId: presence.gameInstanceId || null,
                        universeId:     presence.universeId     || null
                    };
                });

                // in game > in studio > online > offline, so the active ones show up first
                const statusPriority = { game: 3, other: 2, online: 1, offline: 0 };

                const bestFriendsList = allFriends
                    .filter(friend => bestFriends.has(friend.id))
                    .sort((friendA, friendB) => {
                        const statusA = sharedOnlineStatusMap[friendA.id] || 'offline';
                        const statusB = sharedOnlineStatusMap[friendB.id] || 'offline';
                        return statusPriority[statusB] - statusPriority[statusA];
                    });

                if (bestFriendsList.length === 0) return;

                const friendIds = bestFriendsList.map(friend => friend.id);
                const avatarMap = toAvatarMap(await fetchPlayerThumbnailsBatch(friendIds));

                bestFriendsList.forEach(friend => {
                    const tile = createBestFriendTile(friend, avatarMap[friend.id]);
                    const status = sharedOnlineStatusMap[friend.id] || 'offline';

                    if (status === 'online' || status === 'offline') {
                        tile.classList.add('ROLOCATE_hover-enabled');
                    }

                    // update the little status dot on the avatar
                    const statusIcon = tile.querySelector('[data-testid="presence-icon"]');
                    if (statusIcon) {
                        statusIcon.className = '';
                        statusIcon.classList.add(`icon-${status}`);

                        const statusTitles = { online: 'Online', other: 'In Studio', game: 'In Game', offline: 'Offline' };
                        const statusColors = { online: '#00a2ff', other: '#f68802', game: '#02b757', offline: '#6b7280' };
                        statusIcon.setAttribute('title', statusTitles[status]);
                        statusIcon.style.background = statusColors[status];
                    }

                    const displayName = friend.displayName || friend.name;
                    attachTileTooltip(tile, friend.id, displayName);

                    bestFriendsCarousel.appendChild(tile);
                });

                // slight delay so the dom has settled before we try styling
                setTimeout(() => applyFriendStatusStyling(), 100);
            } catch (error) {
                ConsoleLogEnabled('[populateBestFriendsSection] Error:', error);
            }
        };

        // hides best friends from the normal list so they dont show up twice
        const removeBestFriendsFromRegularSection = () => {
            const bestFriends = getBestFriends();
            if (bestFriends.size === 0) return;

            const regularFriendTiles = document.querySelectorAll('.friend-carousel-container:not(.best-friends-section .friends-carousel-container) .friends-carousel-tile');

            regularFriendTiles.forEach(tile => {
                const profileLink = tile.querySelector('a[href*="/users/"]');
                if (profileLink) {
                    const match = profileLink.href.match(/\/users\/(\d+)/);
                    if (match) {
                        const friendId = parseInt(match[1]);
                        if (bestFriends.has(friendId)) {
                            tile.style.display = 'none';
                        }
                    }
                }
            });
        };

        // builds a single friend tile element for the best friends carousel
        const createBestFriendTile = (friend, avatarUrl) => {
            const tile = document.createElement('div');
            tile.className = 'friends-carousel-tile';
            tile.style.cssText = `
        flex: 0 0 auto;
        width: 100px;
        text-align: center;
        cursor: pointer;
        padding: 8px;
        border-radius: 8px;
        transition: background-color 0.2s ease;
    `;

            const avatarCard = document.createElement('div');
            avatarCard.className = 'avatar-card';
            avatarCard.style.cssText = `position: relative; margin-bottom: 8px;`;

            const avatarCardImage = document.createElement('div');
            avatarCardImage.className = 'avatar-card-image';
            avatarCardImage.style.cssText = `position: relative; width: 84px; height: 84px; margin: 0 auto;`;

            const avatarImg = document.createElement('img');
            // fall back to builderman if we didnt get an avatar for some reason
            avatarImg.src = avatarUrl || window.Base64Images.builderman_avatar;
            avatarImg.alt = friend.displayName || friend.name;
            avatarImg.style.cssText = `width: 100%; height: 100%; border-radius: 50%; object-fit: cover;`;

            const avatarStatusWrapper = document.createElement('div');
            avatarStatusWrapper.className = 'avatar-status';
            avatarStatusWrapper.style.cssText = `
        position: absolute;
        bottom: 2px;
        right: 2px;
        width: 24px;
        height: 24px;
        background: #1a1c23;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #1a1c23;
    `;

            // starts as offline, gets updated later once we have presence data
            const statusIcon = document.createElement('span');
            statusIcon.setAttribute('data-testid', 'presence-icon');
            statusIcon.className = 'icon-offline';
            statusIcon.setAttribute('title', 'Offline');
            statusIcon.style.cssText = `width: 16px; height: 16px; border-radius: 50%; background: #6b7280; display: block;`;

            avatarStatusWrapper.appendChild(statusIcon);
            avatarCardImage.appendChild(avatarImg);
            avatarCardImage.appendChild(avatarStatusWrapper);
            avatarCard.appendChild(avatarCardImage);

            const nameLabel = document.createElement('div');
            nameLabel.className = 'friend-name';
            nameLabel.textContent = friend.displayName || friend.name;
            nameLabel.style.cssText = `
        color: ${isDarkMode() ? 'white' : 'black'};
        font-size: 12px;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 100px;
    `;

            tile.appendChild(avatarCard);
            tile.appendChild(nameLabel);

            // clicking the tile opens their profile but on the same page cause roblox like that
            tile.addEventListener('click', () => {
                window.location.href = `https://www.roblox.com/users/${friend.id}/profile`;
            });

            return tile;
        };

        // reads the status dot on a tile and returns a string like 'online', 'game', etc
        const getFriendStatusFromTile = (tile) => {
            const avatarStatusElement = tile.querySelector('.avatar-status');
            if (!avatarStatusElement) return 'offline';

            const statusIconElement = avatarStatusElement.querySelector('span[data-testid="presence-icon"]');
            if (!statusIconElement) return 'offline';

            const className = statusIconElement.className || '';
            const titleAttr = statusIconElement.getAttribute('title') || '';

            if (className.includes('icon-game')    || className.includes('game')    || titleAttr.toLowerCase().includes('game')    || titleAttr.toLowerCase().includes('playing')) return 'game';
            if (className.includes('icon-online')  || className.includes('online')  || titleAttr.toLowerCase().includes('website') || titleAttr.toLowerCase().includes('active'))  return 'online';
            if (className.includes('icon-offline') || className.includes('offline') || titleAttr.toLowerCase().includes('offline'))                                                return 'offline';

            return className.trim() ? 'other' : 'offline';
        };

        // goes through all tiles and adds the colored border class based on their status
        const applyFriendStatusStyling = () => {
            document.querySelectorAll('.friends-carousel-tile').forEach(tileElement => {
                const avatarImage = tileElement.querySelector('.avatar-card-image img');
                if (!avatarImage) return;

                // clear old status classes before adding the new one
                Object.values(CLASSES).forEach(className => {
                    if (className.startsWith('ROLOCATE_friend-status-')) avatarImage.classList.remove(className);
                });

                const status = getFriendStatusFromTile(tileElement);
                const statusClass = CLASSES[`STATUS_${status.toUpperCase()}`];
                if (statusClass) avatarImage.classList.add(statusClass);

                tileElement.setAttribute(`data-${CLASSES.TILE_STYLED}`, 'true');
            });
        };

        // applies some extra styling to roblox's native dropdowns so they dont look out of place
        const styleDropdownMenus = () => {
            document.querySelectorAll(`.friend-tile-dropdown:not([data-${CLASSES.DROPDOWN_STYLED}])`).forEach(dropdown => {
                const parentTile = dropdown.closest('.friends-carousel-tile');
                dropdown.setAttribute('data-friend-status', parentTile ? getFriendStatusFromTile(parentTile) : 'offline');
                dropdown.setAttribute(`data-${CLASSES.DROPDOWN_STYLED}`, 'true');
                dropdown.querySelectorAll('.friend-tile-dropdown-button .icon').forEach(icon => {
                    icon.style.transition = 'opacity 0.2s ease';
                    icon.style.flexShrink = '0';
                });
            });
        };

        // api stuff

        // fetches the full friends list for a user, also patches any missing names
        const gmFetchFriends = async (userId) => {
            const url = `https://friends.roblox.com/v1/users/${userId}/friends`;
            return new Promise((resolve) => {
                GM_xmlhttpRequest({
                    method: "GET", url,
                    onload: async (response) => {
                        if (response.status >= 200 && response.status < 300) {
                            try {
                                const data = JSON.parse(response.responseText);
                                let friendsList = data.data;
                                // roblox sometimes returns friends with blank names, fix those
                                const friendsMissingNames = friendsList.filter(friend => !friend.name || !friend.displayName || friend.name === "" || friend.displayName === "");
                                if (friendsMissingNames.length > 0) {
                                    ConsoleLogEnabled(`[gmFetchFriends] Found ${friendsMissingNames.length} friends with missing name data, fetching...`);
                                    const fetchedData = await fetchUserDataWithRateLimit(friendsMissingNames);
                                    const fetchedDataMap = {};
                                    fetchedData.forEach((userData, index) => { if (userData) fetchedDataMap[friendsMissingNames[index].id] = userData; });
                                    friendsList = friendsList.map(friend => fetchedDataMap[friend.id] ? { ...friend, name: fetchedDataMap[friend.id].name, displayName: fetchedDataMap[friend.id].displayName } : friend);
                                }
                                resolve(friendsList);
                            } catch (parseError) { ConsoleLogEnabled(`[gmFetchFriends] Parse error`, parseError); resolve(null); }
                        } else { ConsoleLogEnabled(`[gmFetchFriends] Status ${response.status}`); resolve(null); }
                    },
                    onerror: (err) => { ConsoleLogEnabled(`[gmFetchFriends] Network error`, err); resolve(null); }
                });
            });
        };

        // fetches user data in small batches so we dont get rate limited
        const fetchUserDataWithRateLimit = async (friends) => {
            const results = [];
            const RATE_LIMIT_DELAY = 100;
            const BATCH_SIZE = 5;
            for (let offset = 0; offset < friends.length; offset += BATCH_SIZE) {
                const batch = friends.slice(offset, offset + BATCH_SIZE);
                results.push(...await Promise.all(batch.map(friend => fetchIndividualUserData(friend.id))));
                if (offset + BATCH_SIZE < friends.length) await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
            }
            return results;
        };

        // fetches a single user's name/displayname, retries on 429
        const fetchIndividualUserData = (userId) => {
            return new Promise((resolve) => {
                GM_xmlhttpRequest({
                    method: "GET", url: `https://users.roblox.com/v1/users/${userId}`,
                    onload: (response) => {
                        if (response.status >= 200 && response.status < 300) {
                            try {
                                const data = JSON.parse(response.responseText);
                                resolve({ id: data.id, name: data.name, displayName: data.displayName });
                            } catch (parseError) { resolve(null); }
                        } else if (response.status === 429) {
                            // got rate limited, wait a sec and try again
                            setTimeout(() => fetchIndividualUserData(userId).then(resolve), 1000);
                        } else { resolve(null); }
                    },
                    onerror: () => resolve(null)
                });
            });
        };

        // creates the little gold star svg that shows on best friend items
        const createStarIcon = () => {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', CLASSES.BEST_FRIEND_STAR);
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('fill', 'currentColor');
            svg.setAttribute('stroke', 'none');
            const starPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            starPath.setAttribute('d', 'M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z');
            svg.appendChild(starPath);
            // tiny delay so the css transition actually plays
            setTimeout(() => svg.classList.add('star-visible'), 50);
            return svg;
        };

        // runs a function in the page's actual js context, needed to call roblox's internal apis
        const runInPageContext = (fn, args = []) => {
            const script = document.createElement('script');
            script.textContent = `(${fn.toString()})(${args.map(arg => JSON.stringify(arg)).join(',')});`;
            document.documentElement.appendChild(script);
            script.remove();
        };

        // reads best friend ids from localstorage and returns them as a Set
        const getBestFriends = () => {
            try {
                const stored = localStorage.getItem('ROLOCATE_BEST_FRIENDS_IDS');
                return stored ? new Set(JSON.parse(stored)) : new Set();
            } catch (err) { return new Set(); }
        };

        const saveBestFriends = (bestFriends) => {
            localStorage.setItem('ROLOCATE_BEST_FRIENDS_IDS', JSON.stringify([...bestFriends]));
        };

        // gets the list of online friends with their presence info
        const fetchOnlineFriends = async (userId) => {
            try {
                const response = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: "GET",
                        url: `https://friends.roblox.com/v1/users/${userId}/friends/online`,
                        onload: resolve, onerror: reject
                    });
                });
                if (response.status >= 200 && response.status < 300) {
                    return JSON.parse(response.responseText).data || [];
                }
                return [];
            } catch { return []; }
        };

        // just logs what each best friend is up to, mostly for debugging
        const checkBestFriendsStatus = async () => {
            const currentUserId = getCurrentUserId();
            if (!currentUserId) return;
            const bestFriends = getBestFriends();
            if (bestFriends.size === 0) return;
            const onlineFriends = await fetchOnlineFriends(currentUserId);
            bestFriends.forEach(bestFriendId => {
                const friend = onlineFriends.find(onlineFriend => onlineFriend.id === bestFriendId);
                if (friend) {
                    const presence = friend.userPresence;
                    if (presence.UserPresenceType === 'Online')  ConsoleLogEnabled(`ROLOCATE: Best friend ${bestFriendId} is online`);
                    else if (presence.UserPresenceType === 'InGame') ConsoleLogEnabled(`ROLOCATE: Best friend ${bestFriendId} is in-game: ${presence.lastLocation}`);
                    else ConsoleLogEnabled(`ROLOCATE: Best friend ${bestFriendId} is in-studio: ${presence.UserPresenceType}`);
                } else {
                    ConsoleLogEnabled(`ROLOCATE: Best friend ${bestFriendId} is offline`);
                }
            });
        };

        // the popup where you pick who your best friends are
        const showBestFriendsPopup = async () => {
            const overlay = document.createElement('div');
            overlay.className = 'best-friends-overlay';

            const popup = document.createElement('div');
            popup.className = 'best-friends-popup';

            const header = document.createElement('div');
            header.className = 'best-friends-popup-header';
            header.innerHTML = `<h3>Pick Your Best Friends</h3>`;

            const searchContainer = document.createElement('div');
            searchContainer.className = 'best-friends-search-container';
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.className = 'best-friends-search';
            searchInput.placeholder = 'Search friends';
            searchContainer.appendChild(searchInput);
            header.appendChild(searchContainer);

            const closeButton = document.createElement('button');
            closeButton.className = 'best-friends-close';
            closeButton.innerHTML = '×';
            header.appendChild(closeButton);

            popup.appendChild(header);

            const grid = document.createElement('div');
            grid.className = 'best-friends-popup-grid';
            grid.innerHTML = `<div class="best-friends-loading"><div class="loading-spinner"></div>Loading friends...</div>`;

            popup.appendChild(grid);
            overlay.appendChild(popup);
            document.body.appendChild(overlay);

            let bestFriends = getBestFriends();

            closeButton.addEventListener('click', () => {
                overlay.style.animation = 'fadeOut 0.2s ease-out forwards';
                setTimeout(() => overlay.remove(), 200);
            });

            let allFriends = [];
            const performSearch = () => {
                const searchTerm = searchInput.value.toLowerCase();
                if (!allFriends.length) return;
                grid.innerHTML = '';
                const filteredFriends = allFriends.filter(friend => friend.displayName.toLowerCase().includes(searchTerm));
                if (!filteredFriends.length) { grid.innerHTML = '<div class="no-best-friends">No friends match your search</div>'; return; }
                filteredFriends.forEach(friend => grid.appendChild(createFriendItem(friend, bestFriends.has(friend.id))));
            };
            searchInput.addEventListener('input', performSearch);

            // fire off the friends fetch without blocking, so the popup shows immediately
            (async () => {
                try {
                    const currentUserId = getCurrentUserId() || null;
                    if (!currentUserId) { grid.innerHTML = 'Failed to get current user ID.'; return; }

                    const friends = await gmFetchFriends(currentUserId);
                    if (!friends || !friends.length) { grid.innerHTML = '<div class="no-best-friends">You have no friends.</div>'; return; }

                    // clear the loading spinner now that we have data
                    grid.innerHTML = '';

                    // render all the names right away with placeholder avatars, then swap in real images as they load
                    allFriends = friends.map(friend => ({ id: friend.id, displayName: friend.displayName || friend.name, avatarUrl: null }));
                    const friendItemMap = {};
                    allFriends.forEach(friend => {
                        const item = createFriendItem(friend, bestFriends.has(friend.id));
                        friendItemMap[friend.id] = item;
                        grid.appendChild(item);
                    });

                    // fetch avatars in parallel batches so it doesnt take forever
                    const friendIds = friends.map(friend => friend.id);
                    const AVATAR_BATCH_SIZE = 10;
                    const avatarBatches = [];
                    for (let offset = 0; offset < friendIds.length; offset += AVATAR_BATCH_SIZE) {
                        avatarBatches.push(friendIds.slice(offset, offset + AVATAR_BATCH_SIZE));
                    }
                    avatarBatches.forEach(batch => {
                        fetchPlayerThumbnailsBatch(batch).then(raw => { const avatarMap = toAvatarMap(raw);
                            batch.forEach(friendId => {
                                if (!avatarMap[friendId]) return;
                                const friendEntry = allFriends.find(friend => friend.id === friendId);
                                if (friendEntry) friendEntry.avatarUrl = avatarMap[friendId];
                                const avatarDiv = friendItemMap[friendId]?.querySelector('.best-friend-avatar');
                                if (avatarDiv) {
                                    avatarDiv.textContent = '';
                                    const avatarImg = document.createElement('img');
                                    avatarImg.src = avatarMap[friendId];
                                    avatarImg.alt = friendEntry?.displayName || '';
                                    avatarDiv.appendChild(avatarImg);
                                }
                            });
                        });
                    });

                } catch (err) {
                    ConsoleLogEnabled('[showBestFriendsPopup] Error:', err);
                    grid.innerHTML = '<div class="no-best-friends">Failed to load friends</div>';
                }
            })();

            // builds one friend card for the picker grid
            function createFriendItem(friend, isBestFriend) {
                const item = document.createElement('div');
                item.className = 'best-friends-popup-item';

                const avatarDiv = document.createElement('div');
                avatarDiv.className = 'best-friend-avatar';
                if (friend.avatarUrl) {
                    const avatarImg = document.createElement('img');
                    avatarImg.src = friend.avatarUrl;
                    avatarImg.alt = friend.displayName;
                    avatarDiv.appendChild(avatarImg);
                } else { avatarDiv.textContent = '👤'; }

                const nameSpan = document.createElement('span');
                nameSpan.className = 'best-friend-name';
                nameSpan.textContent = friend.displayName;

                item.appendChild(avatarDiv);
                item.appendChild(nameSpan);
                if (isBestFriend) item.appendChild(createStarIcon());

                // clicking toggles them as a best friend
                item.addEventListener('click', (event) => {
                    event.stopPropagation();
                    if (bestFriends.has(friend.id)) {
                        bestFriends.delete(friend.id);
                        const starIcon = item.querySelector(`.${CLASSES.BEST_FRIEND_STAR}`);
                        if (starIcon) { starIcon.classList.remove('star-visible'); setTimeout(() => starIcon.remove(), 300); }
                    } else {
                        if (bestFriends.size >= 20) { notifications('Maximum of 20 best friends allowed!', 'error', '⚠️', '2000'); return; }
                        bestFriends.add(friend.id);
                        item.appendChild(createStarIcon());
                    }
                    saveBestFriends(bestFriends);
                });

                return item;
            }
        };

        const handleBestFriendsButtonClick = () => {
            showBestFriendsPopup();
            notifications('Once you pick your best friends, make sure to refresh the page for it to show best friends!', 'info', '', '12000');
        };

        // the little person icon that goes on the best friends button
        const createPersonIcon = () => {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', 'currentColor');
            svg.setAttribute('stroke-width', '2');
            svg.setAttribute('stroke-linecap', 'round');
            svg.setAttribute('stroke-linejoin', 'round');
            const bodyPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            bodyPath.setAttribute('d', 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2');
            svg.appendChild(bodyPath);
            const headCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            headCircle.setAttribute('cx', '12'); headCircle.setAttribute('cy', '7'); headCircle.setAttribute('r', '4');
            svg.appendChild(headCircle);
            return svg;
        };

        // inserts the "best friends" button next to the friends section header
        const createAndInsertBestFriendsButton = () => {
            if (document.querySelector(`.${CLASSES.BEST_FRIENDS_BUTTON}`)) return;
            const sectionHeader = document.querySelector('.container-header.people-list-header h2');
            if (!sectionHeader) return;
            const button = document.createElement('button');
            button.className = CLASSES.BEST_FRIENDS_BUTTON;
            button.appendChild(createPersonIcon());
            button.appendChild(document.createTextNode('Best Friends'));
            button.addEventListener('click', handleBestFriendsButtonClick);
            sectionHeader.insertAdjacentElement('afterend', button);
        };

        // watches for the button getting removed by roblox's spa navigation and re-adds it
        const setupBestFriendsButtonObserver = () => {
            if (bestFriendsButtonObserver) bestFriendsButtonObserver.disconnect();
            bestFriendsButtonObserver = new MutationObserver(() => createAndInsertBestFriendsButton());
            bestFriendsButtonObserver.observe(document.body, { childList: true, subtree: true });
        };

        // watches for roblox's native dropdowns being added so we can style them
        const setupDropdownMutationObserver = () => {
            if (dropdownObserver) dropdownObserver.disconnect();
            dropdownObserver = new MutationObserver((mutations) => {
                let needsUpdate = false;
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList') mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && (node.classList?.contains('friend-tile-dropdown') || node.querySelector?.('.friend-tile-dropdown'))) needsUpdate = true;
                    });
                });
                if (needsUpdate) styleDropdownMenus();
            });
            dropdownObserver.observe(document.body, { childList: true, subtree: true });
        };

        // watches for avatar/status changes in the friends carousel and re-applies our colored borders
        const setupAvatarMutationObserver = () => {
            if (avatarObserver) avatarObserver.disconnect();
            const friendsContainer = document.querySelector('.friend-carousel-container');
            if (!friendsContainer) return;
            avatarObserver = new MutationObserver((mutations) => {
                let needsUpdate = false;
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList') mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && (node.classList?.contains('friends-carousel-tile') || node.querySelector?.('.friends-carousel-tile') || node.classList?.contains('avatar-card-image') || node.classList?.contains('avatar-status'))) needsUpdate = true;
                    });
                    else if (mutation.type === 'attributes') {
                        const target = mutation.target;
                        if (target.classList?.contains('avatar-status') || target.getAttribute('data-testid') === 'presence-icon' || target.closest?.('.avatar-status') || target.closest?.('.friends-carousel-tile')) needsUpdate = true;
                    }
                });
                if (needsUpdate) setTimeout(applyFriendStatusStyling, 100);
            });
            avatarObserver.observe(friendsContainer, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'title', 'src'] });
        };

        // styles the friends container div to match our custom look
        const applyFriendsContainerStyling = () => {
            const friendsContainer = document.querySelector('.friend-carousel-container');
            if (!friendsContainer) return false;
            friendsContainer.style.backgroundColor = isDarkMode() ? '#1a1c23' : '#E0D8CC';
            friendsContainer.style.borderRadius    = '12px';
            friendsContainer.style.border          = `1px solid ${isDarkMode() ? '#1a1c23' : '#C1B19A'}`;
            friendsContainer.style.padding         = '12px';
            friendsContainer.style.boxSizing       = 'border-box';
            friendsContainer.style.margin          = '0 0 16px 0';
            return true;
        };

        // kicks everything off once we know the friends section is on the page
        const initializeBetterFriendsFeatures = () => {
            if (!applyFriendsContainerStyling()) return false;
            addStatusStyles();
            applyFriendStatusStyling();
            setupDropdownMutationObserver();
            setupAvatarMutationObserver();
            setupBestFriendsButtonObserver();
            createAndInsertBestFriendsButton();
            createBestFriendsSection();
            removeBestFriendsFromRegularSection();

            // roblox sets the userId a bit late so we poll until its ready
            const waitForUserId = () => {
                if (getCurrentUserId()) checkBestFriendsStatus();
                else requestAnimationFrame(waitForUserId);
            };
            waitForUserId(); // ik i should use the universal one but here its fine.
            return true;
        };

        const cleanupAllObservers = () => {
            if (dropdownObserver)          dropdownObserver.disconnect();
            if (avatarObserver)            avatarObserver.disconnect();
            if (mainObserver)              mainObserver.disconnect();
            if (bestFriendsButtonObserver) bestFriendsButtonObserver.disconnect();
            if (observerTimeout)           clearTimeout(observerTimeout);
            removeStatusTooltip();
        };

        const checkForFriendsSectionExistence = () =>
            document.querySelector('.friend-carousel-container') ||
            document.querySelector('.add-friends-icon-container');

        // if the friends section is already there just go for it, otherwise wait for it
        if (checkForFriendsSectionExistence()) {
            initializeBetterFriendsFeatures();
            return cleanupAllObservers;
        }

        // give up after 15 seconds if the friends section never shows up
        observerTimeout = setTimeout(cleanupAllObservers, 15000);

        mainObserver = new MutationObserver(() => {
            if (checkForFriendsSectionExistence()) {
                if (initializeBetterFriendsFeatures()) {
                    mainObserver.disconnect();
                    if (observerTimeout) clearTimeout(observerTimeout);
                }
            }
        });
        mainObserver.observe(document.body, { childList: true, subtree: true });

        return cleanupAllObservers;
    }


    /*******************************************************
    name of function: restoreclassicterms
    description: restores the classic terms that roblox removed
    *******************************************************/
    function restoreclassicterms() {
        // bug report fix #308650
        if (window.location.pathname.toLowerCase() === '/login' || window.location.pathname.toLowerCase().match(/^\/[a-z]{2}\/login$/)) {
            return;
        }

        if (localStorage.getItem("ROLOCATE_restoreclassicterms") !== "true") return;

        // language from the page
        const htmlElement = document.querySelector('html');
        const robloxLang = (htmlElement.getAttribute('lang') ||
            htmlElement.getAttribute('xml:lang') ||
            'en').split('-')[0].toLowerCase();
        const currentLang = Object.prototype.hasOwnProperty.call(classicTerms, robloxLang) ? robloxLang : 'en';
        const classicTermReplacementsList = classicTerms[currentLang];

        const attributesToCheckForTextContent = ["placeholder", "title", "aria-label", "alt"];
        const htmlTagsToTargetForReplacement = [
            "span", "div", "a", "button", "label", "input", "textarea",
            "h1", "h2", "h3", "li", "p"
        ];

        function isElementInOverrideContainer(element) { // stuff that the script did not catch
            return !!element.closest(`
                .container-header.people-list-header,
                .server-list-container-header,
                .profile-header-social-count,
                .create-server-banner-text,
                .play-with-others-text,
                .announcement-display-body-content,
                .profile-header-buttons,
                .friends-in-server-label,
                .friends-carousel-display-name,
                .actions-btn-container,
                .games-list-header,
                .catalog-header,
                .chat-search-input,
                .select-friends-input,
                .content-action-utility,
                #user-profile-header-AddFriend,
                .content-emphasis,
                .toast-content
            `.replace(/\s+/g, ''));
        }

        function isElementInBlockedGameContext(element) {
            if (isElementInOverrideContainer(element)) return false;

            const experienceTerms = { // tf did i do here
                en: 'experience',
                fr: 'expérience',
                es: 'experiencia'
            };
            const currentExperienceTerm = experienceTerms[currentLang] || 'experience';
            const isExperienceTerm = element.textContent &&
                new RegExp(currentExperienceTerm, 'i').test(element.textContent);

            let currentElement = element;
            while (currentElement) {
                const elementIdLower = (currentElement.id || "").toLowerCase();
                if (!isExperienceTerm && elementIdLower.includes("game")) return true;

                const classList = currentElement.classList;
                if (classList) {
                    for (const className of classList) {
                        const lowerClassName = className.toLowerCase(); // to keep safe
                        if (
                            lowerClassName.includes("shopping-cart") ||
                            lowerClassName.includes("catalog-item-container") ||
                            lowerClassName.includes("catalog") ||
                            lowerClassName.includes("profile-header-details") ||
                            lowerClassName.includes("rolocate_smartsearch_") ||
                            lowerClassName.includes("avatar-card-container") ||
                            lowerClassName.includes("dialog-container") ||
                            lowerClassName.includes("friends-carousel-tile-label") ||
                            lowerClassName.includes("chat-container") ||
                            lowerClassName.includes("profile") ||
                            lowerClassName.includes("mutual-friends-container") ||
                            lowerClassName.includes("game-name") ||
                            lowerClassName.includes("settings-container") ||
                            lowerClassName.includes("text-overflow") ||
                            lowerClassName.includes("profile-about-content-text") ||
                            lowerClassName.includes("toast-message") ||
                            lowerClassName.includes("dummy-class-for-server-region-edit-so-restoreclassicterms-can-target-this") // yea im the best ikr
                        ) {
                            return true;
                        }
                    }
                }

                currentElement = currentElement.parentElement;
            }

            return false;
        }

        function replaceTextContentWithClassicTerms(textNode) {
            if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;

            let originalText = textNode.textContent;
            let modifiedText = originalText;

            for (const {
                    from,
                    to
                }
                of classicTermReplacementsList) {
                modifiedText = modifiedText.replace(from, to);
            }

            if (modifiedText !== originalText) {
                textNode.textContent = modifiedText;
            }
        }

        function processElementForTermReplacement(element) {
            if (!element || (!isElementInOverrideContainer(element) && isElementInBlockedGameContext(element))) return;

            element.childNodes.forEach(childNode => {
                if (childNode.nodeType === Node.TEXT_NODE) {
                    replaceTextContentWithClassicTerms(childNode);
                }
            });

            attributesToCheckForTextContent.forEach(attribute => {
                const attributeValue = element.getAttribute(attribute);
                if (attributeValue && typeof attributeValue === "string") {
                    let updatedValue = attributeValue;
                    for (const {
                            from,
                            to
                        }
                        of classicTermReplacementsList) {
                        updatedValue = updatedValue.replace(from, to);
                    }
                    if (updatedValue !== attributeValue) {
                        element.setAttribute(attribute, updatedValue);
                    }
                }
            });
        }

        function scanAndReplaceInitialPageContent() {
            htmlTagsToTargetForReplacement.forEach(tag => {
                document.querySelectorAll(tag).forEach(processElementForTermReplacement);
            });
        }

        scanAndReplaceInitialPageContent();

        const domChangeObserver = new MutationObserver(mutationRecords => {
            for (const mutation of mutationRecords) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(addedNode => {
                        if (addedNode.nodeType === Node.ELEMENT_NODE) {
                            processElementForTermReplacement(addedNode);
                            htmlTagsToTargetForReplacement.forEach(tag => {
                                addedNode.querySelectorAll(tag).forEach(processElementForTermReplacement);
                            });
                        } else if (addedNode.nodeType === Node.TEXT_NODE && addedNode.parentElement) {
                            const parent = addedNode.parentElement;
                            if (isElementInOverrideContainer(parent) || !isElementInBlockedGameContext(parent)) {
                                replaceTextContentWithClassicTerms(addedNode);
                            }
                        }
                    });
                } else if (mutation.type === 'characterData') {
                    const textNode = mutation.target;
                    if (textNode.nodeType === Node.TEXT_NODE) {
                        const parent = textNode.parentElement;
                        if (parent && (isElementInOverrideContainer(parent) || !isElementInBlockedGameContext(parent))) {
                            replaceTextContentWithClassicTerms(textNode);
                        }
                    }
                } else if (mutation.type === 'attributes') {
                    const element = mutation.target;
                    const attrName = mutation.attributeName;

                    if (attributesToCheckForTextContent.includes(attrName)) {
                        if (isElementInOverrideContainer(element) || !isElementInBlockedGameContext(element)) {
                            const value = element.getAttribute(attrName);
                            let newValue = value;
                            for (const {
                                    from,
                                    to
                                }
                                of classicTermReplacementsList) {
                                newValue = newValue.replace(from, to);
                            }
                            if (newValue !== value) {
                                element.setAttribute(attrName, newValue);
                            }
                        }
                    }
                }
            }
        });

        domChangeObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: attributesToCheckForTextContent
        });
    }

    /*******************************************************
    name of function: fetchServerDetails
    description: Function to fetch server details so game id and job id. yea!
    *******************************************************/
    // WARNING: Do not republish this script. Licensed for personal use only.
    // oneday I will change the variable names from ip to datacenters
    async function fetchServerDetails(gameId, jobId) { //here!
        const useBatching = localStorage.ROLOCATE_fastservers === "true";

        if (!useBatching) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "POST",
                    url: "https://gamejoin.roblox.com/v1/join-game-instance",
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": "Roblox/WinInet",
                    },
                    data: JSON.stringify({
                        placeId: gameId,
                        gameId: jobId
                    }),
                    onload: function(response) {
                        const json = JSON.parse(response.responseText);
                        ConsoleLogEnabled("API Response:", json);

                        if (json.status === 12 && json.message === 'You need to purchase access to this game before you can play.') {
                            reject('purchase_required');
                            return;
                        }

                        if (json.status === 12 && json.message === 'Cannot join this non-root place due to join restrictions') {
                            reject('subplace_join_restriction');
                            return;
                        }

                        if (json.status === 23 && json.message.includes('You have been banned from this experience by its creators.')) {
                            reject('banned_by_creator');
                            return;
                        }

                        const datacenterId = json?.joinScript?.DataCenterId;
                        if (!datacenterId) {
                            ConsoleLogEnabled("API Response (No DataCenterId) Which means Full Server!:", json);
                            reject(`Unable to fetch server location: Status ${json.status}`);
                            return;
                        }

                        function getLocationData(datacenterId) {
                            const locationId = serverRegionsByIp[datacenterId];
                            if (locationId && serverRegionsByIp._locations && serverRegionsByIp._locations[locationId]) {
                                return serverRegionsByIp._locations[locationId];
                            }
                            return null;
                        }

                        const location = getLocationData(String(datacenterId));
                        if (!location) {
                            ConsoleLogEnabled("API Response (Unknown Location):", json);
                            reject(`Unknown datacenter ID ${datacenterId}`);
                            return;
                        }

                        location.placeVersion = json.joinScript.PlaceVersion;
                        resolve(location);
                    },
                    onerror: function(error) {
                        ConsoleLogEnabled("API Request Failed:", error);
                        reject(`Failed to fetch server details: ${error}`);
                    },
                });
            });
        }

        // batching

        const BATCH_SIZE     = 10; // roblox recently added this limit idk why
        const BATCH_INTERVAL = 1000; // holy nerf roblox. whyyyyyyyyy

        if (!fetchServerDetails._queue)                   fetchServerDetails._queue = [];
        if (fetchServerDetails._timer === undefined)      fetchServerDetails._timer = null;
        if (fetchServerDetails._rateLimited === undefined) fetchServerDetails._rateLimited = false;

        function startDispatcher() {
            if (fetchServerDetails._timer !== null) return;

            fetchServerDetails._timer = setInterval(() => {
                const q = fetchServerDetails._queue;
                if (q.length === 0) {
                    clearInterval(fetchServerDetails._timer);
                    fetchServerDetails._timer = null;
                    return;
                }
                const batch = q.splice(0, BATCH_SIZE);
                ConsoleLogEnabled(`Dispatching batch of ${batch.length} requests`);
                batch.forEach(task => task());
            }, BATCH_INTERVAL);
        }

        const makeRequest = async (gameId, jobId) => {
            return new Promise((innerResolve, innerReject) => {
                GM_xmlhttpRequest({
                    method: "POST",
                    url: "https://gamejoin.roblox.com/v1/join-game-instance",
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": "Roblox/WinInet"
                    },
                    withCredentials: true,
                    data: JSON.stringify({ placeId: gameId, gameId: jobId }),
                    onload: function(response) {
                        const json = JSON.parse(response.responseText);
                        ConsoleLogEnabled("API Response:", json);

                        if (json.status === undefined) {
                            ConsoleLogEnabled("Rate limited detected - status undefined");
                            innerReject('rate_limited');
                            return;
                        }
                        if (json.status === 12 && json.message === 'You need to purchase access to this game before you can play.') {
                            innerReject('purchase_required');
                            return;
                        }
                        if (json.status === 12 && json.message === 'Cannot join this non-root place due to join restrictions') {
                            innerReject('subplace_join_restriction');
                            return;
                        }
                        if (json.status === 23 && json.message.includes('You have been banned from this experience by its creators.')) {
                            innerReject('banned_by_creator');
                            return;
                        }

                        const datacenterId = json?.joinScript?.DataCenterId;
                        if (!datacenterId) {
                            ConsoleLogEnabled("API Response (No DataCenterId) - Full Server:", json);
                            innerReject(`Unable to fetch server location: Status ${json.status}`);
                            return;
                        }

                        function getLocationData(id) {
                            const locationId = serverRegionsByIp[id];
                            if (locationId && serverRegionsByIp._locations?.[locationId])
                                return serverRegionsByIp._locations[locationId];
                            return null;
                        }

                        const location = getLocationData(String(datacenterId));
                        if (!location) {
                            ConsoleLogEnabled("API Response (Unknown Location):", json);
                            innerReject(`Unknown datacenter ID ${datacenterId}`);
                            return;
                        }

                        location.placeVersion = json.joinScript.PlaceVersion;
                        innerResolve(location);
                    },
                    onerror: function(error) {
                        ConsoleLogEnabled("API Request Failed:", error);
                        innerReject(`Failed to fetch server details: ${error}`);
                    },
                });
            });
        };

        return new Promise((resolve, reject) => {
            const task = async () => {
                let attempts = 0;
                const maxAttempts = 100;

                while (attempts < maxAttempts) {
                    try {
                        const result = await makeRequest(gameId, jobId);
                        if (fetchServerDetails._rateLimited) {
                            ConsoleLogEnabled("Rate limit cleared, resuming normal operation");
                            fetchServerDetails._rateLimited = false;
                        }
                        resolve(result);
                        return;
                    } catch (err) {
                        if (err === 'rate_limited') {
                            if (!fetchServerDetails._rateLimited) {
                                ConsoleLogEnabled("Rate limited — will retry in next batch window");
                                fetchServerDetails._rateLimited = true;
                            }
                            ConsoleLogEnabled(`Rate limit retry attempt ${attempts + 1}`);
                            await delay(1000);
                            attempts++;
                        } else {
                            reject(err);
                            return;
                        }
                    }
                }
                reject(new Error(`Rate limited for too long, exceeded ${maxAttempts} attempts`));
            };

            fetchServerDetails._queue.push(task);
            startDispatcher();
        });
    }

    /*******************************************************
    name of function: delay
    description: custom delay also known as sleep function in js cause this language sucks and doesent have a default built-in sleep.
    *******************************************************/
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /*******************************************************
    name of function: HandleRecentServersAddGames
    description: Adds recent servers to localstorage for safe
    keeping
    *******************************************************/
    // WARNING: Do not republish this script. Licensed for personal use only.
    async function HandleRecentServersAddGames(gameId, serverId) {
        const storageKey = "ROLOCATE_recentservers_button"; // don't mind me spamming this around
        const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
        const key = `${gameId}_${serverId}`;

        // check if we already have region data for this server
        if (!stored[key] || !stored[key].region) {
            try {
                // fetch server region if not already stored
                const region = await fetchServerDetails(gameId, serverId);
                stored[key] = {
                    timestamp: Date.now(),
                    region: region
                };
            } catch (error) {
                ConsoleLogEnabled("Failed to fetch server region:", error);
                // store without region data if fetch fails
                if (error?.toString().includes("Unable to fetch server location: Status 12")) {
                    ConsoleLogEnabled("Private Server Detected. Not adding to recentservers");
                    return; // exit the function early
                }
                stored[key] = {
                    timestamp: Date.now(),
                    region: null
                };
            }
        } else {
            // update timestamp but keep existing region data
            stored[key].timestamp = Date.now();
        }

        localStorage.setItem(storageKey, JSON.stringify(stored));
    }

    /*******************************************************
    name of function: fetchUserPresence
    description: Fetches the current presence data for a user
    from the Roblox presence API.
    Returns: Promise that resolves to presence data or null
    *******************************************************/
    async function fetchUserPresence(userId) {
        ConsoleLogEnabled(`Fetching presence for userId: ${userId}`);

        if (!userId) {
            ConsoleLogEnabled("No userId provided to fetchUserPresence");
            return null;
        }

        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: "https://presence.roblox.com/v1/presence/users",
                headers: {
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({
                    userIds: [parseInt(userId)]
                }),
                onload: function(response) {
                    ConsoleLogEnabled(`Presence API response status: ${response.status}`);

                    if (response.status !== 200) {
                        ConsoleLogEnabled(`Presence API error: ${response.status}`);
                        resolve(null);
                        return;
                    }

                    try {
                        const data = JSON.parse(response.responseText);
                        ConsoleLogEnabled(`Presence API response data: ${JSON.stringify(data)}`);

                        if (data.userPresences && data.userPresences.length > 0) {
                            const presence = data.userPresences[0];
                            ConsoleLogEnabled(`Presence data - placeId: ${presence.placeId}, gameId: ${presence.gameId}, userPresenceType: ${presence.userPresenceType}`);
                            resolve(presence);
                        } else {
                            ConsoleLogEnabled("No user presence data in response");
                            resolve(null);
                        }
                    } catch (parseError) {
                        ConsoleLogEnabled(`Error parsing presence API response: ${parseError.message}`);
                        resolve(null);
                    }
                },
                onerror: function(error) {
                    ConsoleLogEnabled(`Presence API request error: ${error}`);
                    resolve(null);
                }
            });
        });
    }
    /*******************************************************
    name of function: HandleRecentServersURLandTrackPresence
    description: Detects recent servers from the url if
    user joins server from invite url and cleans up the URL.
    Also tracks user presence every 30 seconds.
    *******************************************************/
    // WARNING: Do not republish this script. Licensed for personal use only.
    async function HandleRecentServersURLandTrackPresence() {
        const currentPath = window.location.pathname;
        const isGamesPage = /^\/(([a-z]{2}(-[a-z]{2})?)\/)?(games\/.+)/.test(currentPath);
        ConsoleLogEnabled("HandleRecentServersURLandTrackPresence called");

        // static like variable to remember if we've already found an invalid URL
        if (HandleRecentServersURLandTrackPresence.alreadyInvalid) {
            ConsoleLogEnabled("Already checked URL and found invalid, returning early");
            return;
        }
        const url = window.location.href;
        ConsoleLogEnabled(`Current URL: ${url}`);

        // in url to match ROLOCATE_GAMEID and SERVERID from the hash
        const match = url.match(/ROLOCATE_GAMEID=(\d+)_SERVERID=([a-f0-9-]+)/i);
        if (match && match.length === 3) {
            const gameId = match[1];
            const serverId = match[2];
            ConsoleLogEnabled(`Found gameId: ${gameId}, serverId: ${serverId} in URL`);

            // clean up the URL from invite
            const cleanURL = window.location.pathname + window.location.search;
            history.replaceState(null, null, cleanURL);
            ConsoleLogEnabled(`URL cleaned to: ${cleanURL}`);

            // call handler stuff
            await HandleRecentServersAddGames(gameId, serverId);
            document.querySelector(".recent-servers-section")?.remove();
            HandleRecentServers(); // update list visually

        } else {
            ConsoleLogEnabled("No gameId and serverId found in URL. (From invite link)");
            HandleRecentServersURLandTrackPresence.alreadyInvalid = true; // Set internal flag
        }

        // start presence tracking if not already started
        if (!HandleRecentServersURLandTrackPresence.presenceTracking) {
            ConsoleLogEnabled("Starting presence tracking...");
            HandleRecentServersURLandTrackPresence.presenceTracking = true;

            const checkPresence = async () => {
                ConsoleLogEnabled("--- Checking presence ---");
                try {
                    const userId = getCurrentUserId();
                    ConsoleLogEnabled(`userId: ${userId}`);

                    if (!userId) {
                        ConsoleLogEnabled("Could not get userId for presence tracking");
                        return;
                    }

                    // Use the new fetchUserPresence function
                    const presence = await fetchUserPresence(userId);

                    if (!presence) {
                        ConsoleLogEnabled("No presence data returned");
                        return;
                    }

                    const placeId = presence.placeId?.toString();
                    const gameId = presence.gameId;

                    if (!placeId || !gameId) {
                        ConsoleLogEnabled("User not in game or presence data incomplete");
                        return;
                    }

                    ConsoleLogEnabled(`User is in game - placeId: ${placeId}, gameId: ${gameId}`);

                    // get recent servers from localStorage
                    const recentServersData = localStorage.getItem("ROLOCATE_recentservers_button");
                    ConsoleLogEnabled(`Recent servers data from localStorage: ${recentServersData}`);

                    if (!recentServersData) {
                        // no recent servers stored, add this one
                        ConsoleLogEnabled("No recent servers found, adding current server");
                        await HandleRecentServersAddGames(placeId, gameId);
                        if (isGamesPage) {
                            document.querySelector(".recent-servers-section")?.remove();
                            HandleRecentServers(); // update visually
                        }
                        return;
                    }

                    const recentServers = JSON.parse(recentServersData);
                    const serverKey = `${placeId}_${gameId}`;

                    ConsoleLogEnabled(`Checking for serverKey: ${serverKey}`);
                    ConsoleLogEnabled(`Recent servers keys: ${Object.keys(recentServers).join(", ")}`);

                    // check if this server is already in recent servers
                    if (!recentServers[serverKey]) {
                        ConsoleLogEnabled(`New server detected: ${serverKey} - Adding to recent servers`);
                        await HandleRecentServersAddGames(placeId, gameId);
                        if (isGamesPage) {
                            document.querySelector(".recent-servers-section")?.remove();
                            HandleRecentServers(); // to update the list visually
                        }
                    } else {
                        ConsoleLogEnabled(`User still in known server: ${serverKey}`);
                    }

                } catch (error) {
                    ConsoleLogEnabled(`Presence tracking error: ${error.message}`);
                }
            };

            // check immediately on start
            ConsoleLogEnabled("initial presence check");
            checkPresence();

            // then check every 8 seconds
            setInterval(() => {
                ConsoleLogEnabled("every 8 seconds seeing if joined server");
                checkPresence();
            }, 8000);

            ConsoleLogEnabled("Presence tracking started - will check every 8 seconds");
        } else {
            ConsoleLogEnabled("Presence tracking already running");
        }
    }


    /*******************************************************
    name of function: getFlagEmoji
    description: Guves Flag Emoji
    *******************************************************/
    function getFlagEmoji(countryCode) {
        // static variables to maintain state without globals
        if (!getFlagEmoji.flagsData) {
            ConsoleLogEnabled("[getFlagEmoji] Initializing static variables.");
            getFlagEmoji.flagsData = null;
            getFlagEmoji.isLoaded = false;
        }

        // if no countryCode provided, lazy load all data
        if (!countryCode) {
            ConsoleLogEnabled("[getFlagEmoji] No country code provided.");
            if (!getFlagEmoji.isLoaded) {
                ConsoleLogEnabled("[getFlagEmoji] Loading flag data (no countryCode).");
                getFlagEmoji.flagsData = loadFlagsData(); // this function comes from @require
                getFlagEmoji.isLoaded = true;
                ConsoleLogEnabled("[getFlagEmoji] Flag data loaded successfully.");
            } else {
                ConsoleLogEnabled("[getFlagEmoji] Flag data already loaded.");
            }
            return;
        }

        // if data not loaded yet, load it now
        if (!getFlagEmoji.isLoaded) {
            ConsoleLogEnabled(`[getFlagEmoji] Lazy loading flag data for country: ${countryCode}`);
            getFlagEmoji.flagsData = loadFlagsData();
            getFlagEmoji.isLoaded = true;
            ConsoleLogEnabled("[getFlagEmoji] Flag data loaded successfully.");
        }

        const src = getFlagEmoji.flagsData[countryCode];

        ConsoleLogEnabled(`[getFlagEmoji] Creating flag image for country code: ${countryCode}`);

        const img = document.createElement('img');
        img.src = src;
        img.alt = countryCode;
        img.width = 24;
        img.height = 18;
        img.style.verticalAlign = 'middle';
        img.style.marginRight = '4px';

        return img;
    }

    /*******************************************************
    name of function: HandleRecentServers
    description: Detects if recent servers are in localstorage
    and then adds them to the page with css styles
    *******************************************************/
    // WARNING: Do not republish this script. Licensed for personal use only.
    function HandleRecentServers() {
        const currentPath = window.location.pathname;
        const isGamesPage = /^\/(([a-z]{2}(-[a-z]{2})?)\/)?(games\/.+)/.test(currentPath);
        // 2nd saftey check only if on gamepage
        if (!isGamesPage) {
          ConsoleLogEnabled("If you see this, then somethings wrong");
          return;
        }
        const serverList = document.querySelector('.server-list-options');
        if (!serverList || document.querySelector('.recent-servers-section')) return;
        const currentGameId = getCurrentGameId();

        const allHeaders = document.querySelectorAll('.server-list-header');
        let friendsSectionHeader = null;

        allHeaders.forEach(header => { // fix so restore classic terms would not interfere
            const text = header.textContent.trim();
            const match = ['Servers My Connections Are In', 'Servers My Friends Are In'].some(
                label => text === label
            );
            if (match) {
                friendsSectionHeader = header.closest('.container-header');
            }
        });


        function formatLastPlayedWithRelative(lastPlayed, mode) {
            const lastPlayedDate = new Date(lastPlayed);
            const now = new Date();

            const diffMs = now - lastPlayedDate;
            const diffSeconds = Math.floor(diffMs / 1000);
            const diffMinutes = Math.floor(diffSeconds / 60);
            const diffHours = Math.floor(diffMinutes / 60);
            const diffDays = Math.floor(diffHours / 24);

            let relativeTime = '';
            if (diffDays > 0) {
                relativeTime = diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
            } else if (diffHours > 0) {
                relativeTime = diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
            } else if (diffMinutes > 0) {
                relativeTime = diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
            } else {
                relativeTime = diffSeconds <= 1 ? 'just now' : `${diffSeconds} seconds ago`;
            }

            if (mode === "relativeOnly") {
                return relativeTime;
            }

            return `${lastPlayed} (${relativeTime})`;
        }

        if (!friendsSectionHeader) return;

        const theme = {
            bgGradient: 'linear-gradient(145deg, #1e2228, #18191e)',
            bgGradientHover: 'linear-gradient(145deg, #23272f, #1c1f25)',
            accentPrimary: '#4d85ee',
            accentGradient: 'linear-gradient(to bottom, #4d85ee, #3464c9)',
            accentGradientHover: 'linear-gradient(to bottom, #5990ff, #3b6fdd)',
            textPrimary: '#e8ecf3',
            textSecondary: '#a0a8b8',
            borderLight: 'rgba(255, 255, 255, 0.06)',
            borderLightHover: 'rgba(255, 255, 255, 0.12)',
            shadow: '0 5px 15px rgba(0, 0, 0, 0.25)',
            shadowHover: '0 8px 25px rgba(0, 0, 0, 0.3)',
            dangerGradient: 'linear-gradient(to bottom, #ff5b5b, #e04444)',
            dangerGradientHover: 'linear-gradient(to bottom, #ff7575, #f55)',
            popupBg: 'rgba(20, 22, 26, 0.95)',
            popupBorder: 'rgba(77, 133, 238, 0.2)'
        };

        // svgs to save space so no repeats in code
        const emptyServerSVG = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${theme.accentPrimary}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:.7;margin-right:10px"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><circle cx="6" cy="6" r="1" fill="${theme.accentPrimary}"/><circle cx="6" cy="18" r="1" fill="${theme.accentPrimary}"/></svg>
        `;

        const serverstacklogo = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m2 17 10 5 10-5M2 12l10 5 10-5M2 7l10 5 10-5-10-5z" stroke="${theme.accentPrimary}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        `;

        const checkmarksvggeneraluse = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="m8 12 3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        `;

        const checkmarkwithoutcircle = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right:6px"><path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        `;

        const thelikecopysymbol = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="8" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 8V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v9c0 1.1.9 2 2 2h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        `;

        const recentSection = document.createElement('div');
        recentSection.className = 'recent-servers-section premium-dark';
        recentSection.style.marginBottom = '24px';

        const headerContainer = document.createElement('div');
        headerContainer.className = 'container-header';

        const headerInner = document.createElement('div');
        headerInner.className = 'server-list-container-header';
        headerInner.style.padding = '0 4px';
        headerInner.style.display = 'flex';
        headerInner.style.justifyContent = 'space-between';
        headerInner.style.alignItems = 'center';

        const headerTitleContainer = document.createElement('div');
        headerTitleContainer.style.display = 'flex';
        headerTitleContainer.style.alignItems = 'center';

        const headerTitle = document.createElement('h2');
        headerTitle.className = 'server-list-header';
        headerTitle.textContent = 'Recent Servers';
        headerTitle.style.cssText = `
            font-weight: 600;
            color: ${theme.textPrimary};
            letter-spacing: 0.5px;
            position: relative;
            display: inline-block;
            padding-bottom: 4px;
        `;

        const headerAccent = document.createElement('span');
        headerAccent.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            width: 40px;
            height: 2px;
            background: ${theme.accentGradient};
            border-radius: 2px;
        `;
        headerTitle.appendChild(headerAccent);
        headerTitleContainer.appendChild(headerTitle);

        const buttonGroupHeader = document.createElement('div');
        buttonGroupHeader.style.cssText = `
            display: flex;
            gap: 8px;
            align-items: center;
        `;

        const checkStatusButton = document.createElement('button');
        checkStatusButton.textContent = 'Check Status';
        checkStatusButton.style.cssText = `
            background: transparent;
            color: ${theme.textSecondary};
            border: 1px solid ${theme.borderLight};
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 4px;
        `;

        checkStatusButton.innerHTML = `
            ${checkmarksvggeneraluse}
            Check Status
        `;

        checkStatusButton.onmouseover = function() {
            this.style.background = 'rgba(77, 133, 238, 0.15)';
            this.style.color = theme.accentPrimary;
            this.style.borderColor = theme.accentPrimary;
            this.style.transform = 'scale(1.02)';
        };

        checkStatusButton.onmouseout = function() {
            this.style.background = 'transparent';
            this.style.color = theme.textSecondary;
            this.style.borderColor = theme.borderLight;
            this.style.transform = 'scale(1)';
        };

        checkStatusButton.addEventListener('click', async function() {
            const storageKey = "ROLOCATE_recentservers_button"; // again lol
            let stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
            const keys = Object.keys(stored).filter(key => key.startsWith(`${currentGameId}_`));

            if (keys.length === 0) { // if 0 servers
                notifications('No servers to check!', 'info', '', '2000');
                return;
            }

            checkStatusButton.disabled = true;
            const originalText = checkStatusButton.innerHTML;
            checkStatusButton.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 4px; animation: spin 1s linear infinite;">
                    <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Checking...
            `;

            let removedCount = 0;
            const cardsWrapper = document.querySelector('.recent-servers-section .section-content-off');

            for (const key of keys) {
                const [gameId, serverId] = key.split("_");
                try {
                    await fetchServerDetails(gameId, serverId);
                } catch (error) {
                    if (!error.toString().includes("Status 22")) {
                        delete stored[key];
                        removedCount++;
                        const card = document.querySelector(`[data-server-key="${key}"]`);
                        if (card) {
                            card.style.transition = 'all 0.3s ease-out';
                            card.style.opacity = '0';
                            card.style.height = '0';
                            card.style.margin = '0';
                            card.style.padding = '0';
                            setTimeout(() => card.remove(), 300);
                        }
                    }
                }
            }

            localStorage.setItem(storageKey, JSON.stringify(stored));

            if (removedCount > 0) {
                notifications(`Removed ${removedCount} inactive server${removedCount > 1 ? 's' : ''}`, 'success', '🗑️', '2000');

                if (Object.keys(stored).filter(k => k.startsWith(`${currentGameId}_`)).length === 0) {
                    const emptyMessage = document.createElement('div');
                    emptyMessage.className = 'no-servers-message';
                    emptyMessage.innerHTML = `${emptyServerSVG} No Recent Servers Found`;
                    emptyMessage.style.cssText = `
                        color: ${theme.textSecondary};
                        text-align: center;
                        padding: 28px 0;
                        font-size: 14px;
                        letter-spacing: 0.3px;
                        font-weight: 500;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: rgba(20, 22, 26, 0.4);
                        border-radius: 12px;
                        border: 1px solid rgba(77, 133, 238, 0.15);
                        box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.2);
                    `;
                    if (cardsWrapper) {
                        cardsWrapper.innerHTML = '';
                        cardsWrapper.appendChild(emptyMessage);
                    }
                }
            } else {
                notifications('All servers are active!', 'success', '😊', '2000');
            }

            checkStatusButton.innerHTML = originalText;
            checkStatusButton.disabled = false;
        });

        const clearAllButton = document.createElement('button');
        clearAllButton.textContent = 'Clear All';
        clearAllButton.style.cssText = `
            background: transparent;
            color: ${theme.textSecondary};
            border: 1px solid ${theme.borderLight};
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 4px;
        `;

        clearAllButton.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 4px;">
                <path d="M3 6H5H21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 11V17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M14 11V17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Clear All
        `;

        clearAllButton.onmouseover = function() {
            this.style.background = 'rgba(100, 0, 0, 0.85)';
            this.style.color = 'white';
            this.style.borderColor = 'rgba(100, 0, 0, 0.85)';
            this.style.transform = 'scale(1.02)';
        };

        clearAllButton.onmouseout = function() {
            this.style.background = 'transparent';
            this.style.color = theme.textSecondary;
            this.style.borderColor = theme.borderLight;
            this.style.transform = 'scale(1)';
        };

        clearAllButton.addEventListener('click', function() {
            const popup = document.createElement('div');
            popup.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                background: rgba(0, 0, 0, 0.3);
                opacity: 0;
                transition: opacity 0.3s ease;
            `;

            const popupContent = document.createElement('div');
            popupContent.style.cssText = `
                background: ${theme.popupBg};
                border-radius: 12px;
                padding: 20px;
                width: 360px;
                max-width: 90%;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
                border: 1px solid ${theme.popupBorder};
                text-align: center;
                transform: translateY(20px);
                transition: transform 0.3s ease, opacity 0.3s ease;
                opacity: 0;
            `;

            const popupTitle = document.createElement('h3');
            popupTitle.textContent = 'Clear All Recent Servers';
            popupTitle.style.cssText = `
                color: ${theme.textPrimary};
                margin: 0 0 16px 0;
                font-size: 16px;
                font-weight: 600;
            `;

            const popupMessage = document.createElement('p');
            popupMessage.textContent = 'Are you sure you want to clear all recent servers? This action cannot be undone.';
            popupMessage.style.cssText = `
                color: ${theme.textSecondary};
                margin: 0 0 24px 0;
                font-size: 13px;
                line-height: 1.5;
            `;

            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                justify-content: center;
                gap: 12px;
            `;

            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            cancelButton.style.cssText = `
                background: rgba(28, 31, 37, 0.6);
                color: ${theme.textPrimary};
                border: 1px solid rgba(255, 255, 255, 0.12);
                padding: 8px 20px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            `;

            cancelButton.onmouseover = function() {
                this.style.background = 'rgba(35, 39, 46, 0.8)';
                this.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                this.style.transform = 'scale(1.05)';
            };

            cancelButton.onmouseout = function() {
                this.style.background = 'rgba(28, 31, 37, 0.6)';
                this.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                this.style.transform = 'scale(1)';
            };

            cancelButton.addEventListener('click', function() {
                popup.style.opacity = '0';
                setTimeout(() => {
                    popup.remove();
                }, 300);
            });

            const confirmButton = document.createElement('button');
            confirmButton.textContent = 'Clear All';
            confirmButton.style.cssText = `
                background: rgba(100, 0, 0, 0.85);
                color: white;
                border: none;
                padding: 8px 20px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 2px 8px rgba(100, 0, 0, 0.3);
            `;

            confirmButton.onmouseover = function() {
                this.style.background = 'rgba(80, 0, 0, 0.95)';
                this.style.boxShadow = '0 4px 10px rgba(80, 0, 0, 0.4)';
                this.style.transform = 'scale(1.02)';
            };

            confirmButton.onmouseout = function() {
                this.style.background = 'rgba(100, 0, 0, 0.85)';
                this.style.boxShadow = '0 2px 8px rgba(100, 0, 0, 0.3)';
                this.style.transform = 'scale(1)';
            };

            confirmButton.addEventListener('click', function() {
                const cardsWrapper = document.querySelector('.recent-servers-section .section-content-off');
                if (cardsWrapper) {
                    cardsWrapper.querySelectorAll('.recent-server-card').forEach(card => {
                        card.style.transition = 'all 0.3s ease-out';
                        card.style.opacity = '0';
                        card.style.height = '0';
                        card.style.margin = '0';
                        card.style.padding = '0';
                        setTimeout(() => card.remove(), 300);
                    });
                }

                const storageKey = "ROLOCATE_recentservers_button"; //yep again
                localStorage.setItem(storageKey, JSON.stringify({}));

                const emptyMessage = document.createElement('div');
                emptyMessage.className = 'no-servers-message';
                emptyMessage.innerHTML = `${emptyServerSVG} No Recent Servers Found`;
                emptyMessage.style.cssText = `
                    color: ${theme.textSecondary};
                    text-align: center;
                    padding: 28px 0;
                    font-size: 14px;
                    letter-spacing: 0.3px;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(20, 22, 26, 0.4);
                    border-radius: 12px;
                    border: 1px solid rgba(77, 133, 238, 0.15);
                    box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.2);
                `;

                if (cardsWrapper) {
                    cardsWrapper.innerHTML = '';
                    cardsWrapper.appendChild(emptyMessage);
                }

                popup.style.opacity = '0';
                setTimeout(() => {
                    popup.remove();
                }, 300);
            });

            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(confirmButton);
            popupContent.appendChild(popupTitle);
            popupContent.appendChild(popupMessage);
            popupContent.appendChild(buttonContainer);
            popup.appendChild(popupContent);
            document.body.appendChild(popup);

            setTimeout(() => {
                popup.style.opacity = '1';
                popupContent.style.transform = 'translateY(0)';
                popupContent.style.opacity = '1';
            }, 10);

            popup.addEventListener('click', function(e) {
                if (e.target === popup) {
                    popup.style.opacity = '0';
                    setTimeout(() => {
                        popup.remove();
                    }, 300);
                }
            });
        });

        buttonGroupHeader.appendChild(checkStatusButton);
        buttonGroupHeader.appendChild(clearAllButton);
        headerInner.appendChild(headerTitleContainer);
        headerInner.appendChild(buttonGroupHeader);
        headerContainer.appendChild(headerInner);

        const contentContainer = document.createElement('div');
        contentContainer.className = 'section-content-off empty-game-instances-container';
        contentContainer.style.padding = '8px 4px';

        const storageKey = "ROLOCATE_recentservers_button"; // again ik
        let stored = JSON.parse(localStorage.getItem(storageKey) || "{}");

        const currentTime = Date.now();
        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
        let storageUpdated = false;

        Object.keys(stored).forEach(key => {
            const serverData = stored[key];
            const serverTime = typeof serverData === 'object' ? serverData.timestamp : serverData;

            if (currentTime - serverTime > threeDaysInMs) {
                delete stored[key];
                storageUpdated = true;
            }
        });

        if (storageUpdated) {
            localStorage.setItem(storageKey, JSON.stringify(stored));
        }

        const keys = Object.keys(stored).filter(key => key.startsWith(`${currentGameId}_`));
        if (keys.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'no-servers-message';
            emptyMessage.innerHTML = `${emptyServerSVG} No Recent Servers Found`;
            emptyMessage.style.cssText = `
                color: ${theme.textSecondary};
                text-align: center;
                padding: 28px 0;
                font-size: 14px;
                letter-spacing: 0.3px;
                font-weight: 500;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(20, 22, 26, 0.4);
                border-radius: 12px;
                border: 1px solid rgba(77, 133, 238, 0.15);
                box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.2);
            `;
            contentContainer.appendChild(emptyMessage);
        } else {
            keys.sort((a, b) => {
                const aData = stored[a];
                const bData = stored[b];
                const aTime = typeof aData === 'object' ? aData.timestamp : aData;
                const bTime = typeof bData === 'object' ? bData.timestamp : bData;
                return bTime - aTime;
            });

            const cardsWrapper = document.createElement('div');
            cardsWrapper.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin: 2px 0;
            `;

            keys.forEach((key, index) => {
                const [gameId, serverId] = key.split("_");
                const serverData = stored[key];

                const timeStored = typeof serverData === 'object' ? serverData.timestamp : serverData;
                const regionData = typeof serverData === 'object' ? serverData.region : null;

                const date = new Date(timeStored);
                const formattedTime = date.toLocaleString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });

                let regionDisplay = '';
                let flagElement = null;

                if (regionData && regionData !== null) {
                    const city = regionData.city || 'Unknown';
                    const countryCode = (regionData.country && regionData.country.code) || '';
                    flagElement = getFlagEmoji(countryCode);
                } else {
                    flagElement = getFlagEmoji('');
                    regionDisplay = 'Unknown';
                }

                if (!flagElement) {
                    flagElement = document.createTextNode('🌍');
                    regionDisplay = regionDisplay || 'Unknown';
                }

                if (flagElement && flagElement.tagName === 'IMG') {
                    flagElement.style.cssText = `
                        width: 24px;
                        height: 18px;
                        vertical-align: middle;
                        margin-right: 4px;
                        display: inline-block;
                    `;
                }

                if (!regionDisplay) {
                    if (regionData && regionData !== null && regionData.city) {
                        regionDisplay = regionData.city;
                    } else {
                        regionDisplay = 'Unknown';
                    }
                }

                const serverCard = document.createElement('div');
                serverCard.className = 'recent-server-card premium-dark';
                serverCard.dataset.serverKey = key;
                serverCard.dataset.gameId = gameId;
                serverCard.dataset.serverId = serverId;
                serverCard.dataset.region = regionDisplay;
                serverCard.dataset.lastPlayed = formattedTime;
                serverCard.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 22px;
                    height: 76px;
                    border-radius: 14px;
                    background: ${theme.bgGradient};
                    box-shadow: ${theme.shadow};
                    color: ${theme.textPrimary};
                    font-family: 'Segoe UI', 'Helvetica Neue', sans-serif;
                    font-size: 14px;
                    box-sizing: border-box;
                    width: 100%;
                    position: relative;
                    overflow: hidden;
                    border: 1px solid ${theme.borderLight};
                    transition: all 0.2s ease-out;
                `;

                serverCard.onmouseover = function() {
                    this.style.boxShadow = theme.shadowHover;
                    this.style.transform = 'translateY(-2px)';
                    this.style.borderColor = theme.borderLightHover;
                    this.style.background = theme.bgGradientHover;
                };

                serverCard.onmouseout = function() {
                    this.style.boxShadow = theme.shadow;
                    this.style.transform = 'translateY(0)';
                    this.style.borderColor = theme.borderLight;
                    this.style.background = theme.bgGradient;
                };

                const glassOverlay = document.createElement('div');
                glassOverlay.style.cssText = `
                    position: absolute;
                    left: 0;
                    top: 0;
                    right: 0;
                    height: 50%;
                    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0));
                    border-radius: 14px 14px 0 0;
                    pointer-events: none;
                `;
                serverCard.appendChild(glassOverlay);

                const serverIconWrapper = document.createElement('div');
                serverIconWrapper.style.cssText = `
                    position: absolute;
                    left: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                `;

                const serverIcon = document.createElement('div');
                serverIcon.innerHTML = `
                  ${serverstacklogo}
                `;
                serverIconWrapper.appendChild(serverIcon);

                const iconGlow = document.createElement('div');
                iconGlow.style.cssText = `
                    position: absolute;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: ${theme.accentPrimary};
                    opacity: 0.15;
                    z-index: -1;
                `;
                serverIconWrapper.appendChild(iconGlow);

                const left = document.createElement('div');
                left.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    margin-left: 12px;
                    width: calc(100% - 180px);
                `;

                const lastPlayed = document.createElement('div');
                lastPlayed.textContent = `Last Played: ${formatLastPlayedWithRelative(formattedTime, "relativeOnly")}`;
                lastPlayed.style.cssText = `
                    font-weight: 600;
                    font-size: 14px;
                    color: ${theme.textPrimary};
                    line-height: 1.3;
                    letter-spacing: 0.3px;
                    margin-left: 40px;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                `;

                const regionInfo = document.createElement('div');
                regionInfo.style.cssText = `
                    font-size: 12px;
                    color: ${theme.textSecondary};
                    margin-top: 2px;
                    opacity: 0.9;
                    margin-left: 40px;
                    line-height: 18px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                `;

                regionInfo.innerHTML = `<span style="color: ${theme.accentPrimary};">Region:</span> `;
                if (flagElement && (flagElement.nodeType === Node.ELEMENT_NODE || flagElement.nodeType === Node.TEXT_NODE)) {
                    if (flagElement.nodeType === Node.ELEMENT_NODE) {
                        flagElement.style.position = 'relative';
                        flagElement.style.top = '-2px';
                    }
                    regionInfo.appendChild(flagElement);
                } else {
                    regionInfo.appendChild(document.createTextNode('🌍'));
                }

                const regionText = document.createElement('span');
                regionText.textContent = ` ${regionDisplay}`;
                regionText.style.position = 'relative';
                regionText.style.left = '-4px';
                regionInfo.appendChild(regionText);

                left.appendChild(lastPlayed);
                left.appendChild(regionInfo);

                const buttonGroup = document.createElement('div');
                buttonGroup.style.cssText = `
                    display: flex;
                    gap: 12px;
                    align-items: center;
                    z-index: 2;
                `;

                const removeButton = document.createElement('button');
                removeButton.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                `;
                removeButton.className = 'btn-control-xs remove-button';
                removeButton.style.cssText = `
                    background: ${theme.dangerGradient};
                    color: white;
                    border: none;
                    padding: 6px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    letter-spacing: 0.4px;
                    box-shadow: 0 2px 8px rgba(211, 47, 47, 0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 30px;
                    height: 30px;
                `;

                removeButton.onmouseover = function() {
                    this.style.background = theme.dangerGradientHover;
                    this.style.boxShadow = '0 4px 10px rgba(211, 47, 47, 0.4)';
                    this.style.transform = 'translateY(-1px)';
                };

                removeButton.onmouseout = function() {
                    this.style.background = theme.dangerGradient;
                    this.style.boxShadow = '0 2px 8px rgba(211, 47, 47, 0.3)';
                    this.style.transform = 'translateY(0)';
                };

                removeButton.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const serverKey = this.closest('.recent-server-card').dataset.serverKey;

                    serverCard.style.transition = 'all 0.3s ease-out';
                    serverCard.style.opacity = '0';
                    serverCard.style.height = '0';
                    serverCard.style.margin = '0';
                    serverCard.style.padding = '0';

                    setTimeout(() => {
                        serverCard.remove();

                        const storedData = JSON.parse(localStorage.getItem(storageKey) || "{}");
                        delete storedData[serverKey];
                        localStorage.setItem(storageKey, JSON.stringify(storedData));

                        if (document.querySelectorAll('.recent-server-card').length === 0) {
                            const emptyMessage = document.createElement('div');
                            emptyMessage.className = 'no-servers-message';
                            emptyMessage.innerHTML = `${emptyServerSVG} No Recent Servers Found`;
                            emptyMessage.style.cssText = `
                                color: ${theme.textSecondary};
                                text-align: center;
                                padding: 28px 0;
                                font-size: 14px;
                                letter-spacing: 0.3px;
                                font-weight: 500;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                background: rgba(20, 22, 26, 0.4);
                                border-radius: 12px;
                                border: 1px solid rgba(77, 133, 238, 0.15);
                                box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.2);
                            `;
                            cardsWrapper.appendChild(emptyMessage);
                        }
                    }, 300);
                });

                const separator = document.createElement('div');
                separator.style.cssText = `
                    height: 24px;
                    width: 1px;
                    background-color: rgba(255, 255, 255, 0.15);
                    margin: 0 2px;
                `;

                const joinButton = document.createElement('button');
                joinButton.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px;">
                        <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M12 5L19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Join
                `;
                joinButton.className = 'btn-control-xs join-button';
                joinButton.style.cssText = `
                    background: ${theme.accentGradient};
                    color: white;
                    border: none;
                    padding: 8px 18px;
                    border-radius: 10px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    letter-spacing: 0.4px;
                    box-shadow: 0 2px 10px rgba(52, 100, 201, 0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;

                joinButton.addEventListener('click', function() {
                    try {
                        JoinServer(gameId, serverId);
                    } catch (error) {
                        ConsoleLogEnabled("Error joining game:", error);
                    }
                });

                joinButton.onmouseover = function() {
                    this.style.background = theme.accentGradientHover;
                    this.style.boxShadow = '0 4px 12px rgba(77, 133, 238, 0.4)';
                    this.style.transform = 'translateY(-1px)';
                };

                joinButton.onmouseout = function() {
                    this.style.background = theme.accentGradient;
                    this.style.boxShadow = '0 2px 10px rgba(52, 100, 201, 0.3)';
                    this.style.transform = 'translateY(0)';
                };

                const inviteButton = document.createElement('button');
                inviteButton.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="m3 7 9 6 9-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    &nbspInvite
                `;
                inviteButton.className = 'btn-control-xs invite-button';
                inviteButton.style.cssText = `
                    background: rgba(28, 31, 37, 0.6);
                    color: ${theme.textPrimary};
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    padding: 8px 18px;
                    border-radius: 10px;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;

                inviteButton.addEventListener('click', function() {
                    const inviteUrl = `https://oqarshi.github.io/Invite/?placeid=${gameId}&serverid=${serverId}`;
                    inviteButton.disabled = true;

                    navigator.clipboard.writeText(inviteUrl).then(
                        function() {
                            const originalText = inviteButton.innerHTML;
                            inviteButton.innerHTML = `
                                ${checkmarkwithoutcircle}
                                Copied!
                            `;
                            ConsoleLogEnabled(`Invite link copied to clipboard`);
                            notifications('Success! Invite link copied to clipboard!', 'success', '🎉', '2000');
                            setTimeout(() => {
                                inviteButton.innerHTML = originalText;
                                inviteButton.disabled = false;
                            }, 1000);
                        },
                        function(err) {
                            ConsoleLogEnabled('Could not copy text: ', err);
                            inviteButton.disabled = false;
                        }
                    );
                });

                inviteButton.onmouseover = function() {
                    this.style.background = 'rgba(35, 39, 46, 0.8)';
                    this.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                    this.style.transform = 'translateY(-1px)';
                };

                inviteButton.onmouseout = function() {
                    this.style.background = 'rgba(28, 31, 37, 0.6)';
                    this.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    this.style.transform = 'translateY(0)';
                };

                const moreInfoButton = document.createElement('button');
                moreInfoButton.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 8v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16" r=".5" fill="currentColor" stroke="currentColor"/></svg>
                `;
                moreInfoButton.className = 'btn-control-xs more-info-button';
                moreInfoButton.style.cssText = `
                    background: rgba(28, 31, 37, 0.6);
                    color: ${theme.textPrimary};
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    padding: 8px;
                    border-radius: 10px;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 34px;
                    height: 34px;
                `;

                moreInfoButton.onmouseover = function() {
                    this.style.background = 'rgba(35, 39, 46, 0.8)';
                    this.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                    this.style.transform = 'translateY(-1px)';
                    this.style.color = theme.accentPrimary;
                };

                moreInfoButton.onmouseout = function() {
                    this.style.background = 'rgba(28, 31, 37, 0.6)';
                    this.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    this.style.transform = 'translateY(0)';
                    this.style.color = theme.textPrimary;
                };

                moreInfoButton.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const card = this.closest('.recent-server-card');
                    const gameId = card.dataset.gameId;
                    const serverId = card.dataset.serverId;
                    const region = card.dataset.region;
                    const lastPlayed = card.dataset.lastPlayed;

                    const existingPopup = document.querySelector('.server-info-popup');
                    if (existingPopup) existingPopup.remove();

                    const popup = document.createElement('div');
                    popup.className = 'server-info-popup';
                    popup.style.cssText = `
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 9999;
                        background: rgba(0, 0, 0, 0.3);
                        opacity: 0;
                        transition: opacity 0.2s ease-out;
                    `;

                    const popupContent = document.createElement('div');
                    popupContent.style.cssText = `
                        background: ${theme.popupBg};
                        border-radius: 16px;
                        width: 420px;
                        max-width: 90%;
                        padding: 24px;
                        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
                        border: 1px solid ${theme.popupBorder};
                        transform: translateY(20px);
                        opacity: 0;
                        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    `;

                    const popupHeader = document.createElement('div');
                    popupHeader.style.cssText = `
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        padding-bottom: 12px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    `;

                    const popupTitle = document.createElement('h3');
                    popupTitle.textContent = 'Server Information';
                    popupTitle.style.cssText = `
                        color: ${theme.textPrimary};
                        font-size: 18px;
                        font-weight: 600;
                        margin: 0;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    `;

                    const serverIconPopup = document.createElement('div');
                    serverIconPopup.innerHTML = `
                      ${serverstacklogo}
                    `;
                    popupTitle.prepend(serverIconPopup);

                    popupHeader.appendChild(popupTitle);

                    const infoItems = document.createElement('div');
                    infoItems.style.cssText = `
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                    `;

                    function createInfoItem(label, value, icon) {
                        const item = document.createElement('div');
                        item.style.cssText = `
                            display: flex;
                            gap: 12px;
                            align-items: flex-start;
                        `;

                        const iconContainer = document.createElement('div');
                        iconContainer.style.cssText = `
                            background: rgba(77, 133, 238, 0.15);
                            border-radius: 8px;
                            width: 36px;
                            height: 36px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            flex-shrink: 0;
                        `;
                        iconContainer.innerHTML = icon || `
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 8V12V8ZM12 16H12.01H12Z" stroke="${theme.accentPrimary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="${theme.accentPrimary}" stroke-width="1.5"/>
                            </svg>
                        `;

                        const textContainer = document.createElement('div');
                        const labelEl = document.createElement('div');
                        labelEl.textContent = label;
                        labelEl.style.cssText = `
                            color: ${theme.textSecondary};
                            font-size: 12px;
                            font-weight: 500;
                            margin-bottom: 4px;
                        `;

                        const valueEl = document.createElement('div');
                        valueEl.textContent = value;
                        valueEl.style.cssText = `
                            color: ${theme.textPrimary};
                            font-size: 14px;
                            font-weight: 600;
                            word-break: break-all;
                        `;

                        textContainer.appendChild(labelEl);
                        textContainer.appendChild(valueEl);
                        item.appendChild(iconContainer);
                        item.appendChild(textContainer);
                        return item;
                    }

                    infoItems.appendChild(createInfoItem('Game ID', gameId, `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    `)); // a cube cause n!nt*ndo gamecube came up in mind

                    infoItems.appendChild(createInfoItem('Server ID', serverId, `
                        ${checkmarksvggeneraluse}
                    `)); // yea idk what represents this lmao

                    infoItems.appendChild(createInfoItem('Region', region, `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" stroke-width="2"/></svg>
                    `)); // pointy thing on google maps

                    const formattedLastPlayed = formatLastPlayedWithRelative(lastPlayed);
                    infoItems.appendChild(createInfoItem('Last Played', formattedLastPlayed, `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    `)); // a clock

                    const popupFooter = document.createElement('div');
                    popupFooter.style.cssText = `
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                        margin-top: 24px;
                        padding-top: 16px;
                        border-top: 1px solid rgba(255, 255, 255, 0.08);
                    `;

                    const copyButton = document.createElement('button');
                    copyButton.textContent = 'Copy Info';
                    copyButton.style.cssText = `
                        background: rgba(28, 31, 37, 0.6);
                        color: ${theme.textPrimary};
                        border: 1px solid rgba(255, 255, 255, 0.12);
                        padding: 8px 16px;
                        border-radius: 8px;
                        font-size: 13px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.15s ease;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    `;
                    copyButton.innerHTML = `
                        ${thelikecopysymbol}
                        Copy Info
                    `;
                    copyButton.addEventListener('click', function() {
                        const infoText = `Game ID: ${gameId}\nServer ID: ${serverId}\nRegion: ${region}\nLast Played: ${lastPlayed}`;
                        navigator.clipboard.writeText(infoText);
                        copyButton.innerHTML = `
                            ${checkmarkwithoutcircle}
                            Copied!
                        `;
                        setTimeout(() => {
                            copyButton.innerHTML = `
                              ${thelikecopysymbol}
                              Copy Info
                          `;
                        }, 1500);
                    });

                    const closeButton = document.createElement('button');
                    closeButton.textContent = 'Close';
                    closeButton.style.cssText = `
                        background: rgba(77, 133, 238, 0.15);
                        color: ${theme.accentPrimary};
                        border: none;
                        padding: 8px 24px;
                        border-radius: 8px;
                        font-size: 13px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.15s ease;
                    `;
                    closeButton.addEventListener('click', function() {
                        popup.style.opacity = '0';
                        setTimeout(() => {
                            popup.remove();
                        }, 200);
                    });

                    popupFooter.appendChild(copyButton);
                    popupFooter.appendChild(closeButton);

                    popupContent.appendChild(popupHeader);
                    popupContent.appendChild(infoItems);
                    popupContent.appendChild(popupFooter);
                    popup.appendChild(popupContent);

                    document.body.appendChild(popup);

                    setTimeout(() => {
                        popup.style.opacity = '1';
                        popupContent.style.opacity = '1';
                        popupContent.style.transform = 'translateY(0)';
                    }, 10);

                    popup.addEventListener('click', function(e) {
                        if (e.target === popup) {
                            popup.style.opacity = '0';
                            setTimeout(() => {
                                popup.remove();
                            }, 200);
                        }
                    });
                });

                buttonGroup.appendChild(removeButton);
                buttonGroup.appendChild(separator);
                buttonGroup.appendChild(joinButton);
                buttonGroup.appendChild(inviteButton);
                buttonGroup.appendChild(moreInfoButton);

                serverCard.appendChild(serverIconWrapper);
                serverCard.appendChild(left);
                serverCard.appendChild(buttonGroup);

                const lineAccent = document.createElement('div');
                lineAccent.style.cssText = `
                    position: absolute;
                    left: 0;
                    top: 16px;
                    bottom: 16px;
                    width: 3px;
                    background: ${theme.accentGradient};
                    border-radius: 0 2px 2px 0;
                `;
                serverCard.appendChild(lineAccent);

                if (index === 0) {
                    const cornerAccent = document.createElement('div');
                    cornerAccent.style.cssText = `
                        position: absolute;
                        right: 0;
                        top: 0;
                        width: 40px;
                        height: 40px;
                        overflow: hidden;
                        pointer-events: none;
                    `;

                    const cornerInner = document.createElement('div');
                    cornerInner.style.cssText = `
                        position: absolute;
                        right: -20px;
                        top: -20px;
                        width: 40px;
                        height: 40px;
                        background: ${theme.accentPrimary};
                        transform: rotate(45deg);
                        opacity: 0.15;
                    `;

                    cornerAccent.appendChild(cornerInner);
                    serverCard.appendChild(cornerAccent);
                }

                cardsWrapper.appendChild(serverCard);
            });

            contentContainer.appendChild(cardsWrapper);
        }

        recentSection.appendChild(headerContainer);
        recentSection.appendChild(contentContainer);
        friendsSectionHeader.parentNode.insertBefore(recentSection, friendsSectionHeader);
    }

    /*******************************************************
    name of function: showAlreadyInGamePopup
    description: Shows a styled popup when user is already in a game
    *******************************************************/
    async function showAlreadyInGamePopup(currentGameData) {
        return new Promise(async (resolve) => {
            try {
                // Create overlay
                const overlay = document.createElement('div');
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.4);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 100000000;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                `;

                // Create popup
                const popup = document.createElement('div');
                popup.style.cssText = `
                    background: linear-gradient(135deg, #1a1c1e 0%, #232527 100%);
                    border-radius: 16px;
                    padding: 32px;
                    max-width: 420px;
                    width: 90%;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7), 0 0 1px rgba(255, 255, 255, 0.1) inset;
                    color: white;
                    font-family: 'HCo Gotham SSm', 'Helvetica Neue', Helvetica, Arial, sans-serif;
                    transform: scale(0.9);
                    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                `;

                popup.innerHTML = `
                    <div style="text-align: center;">
                        <div id="gameIconContainer" style="
                            width: 150px;
                            height: 150px;
                            border-radius: 12px;
                            margin: 0 auto 20px auto;
                            background: rgba(255, 255, 255, 0.05);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            position: relative;
                            overflow: hidden;
                            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
                        ">
                            <div id="loadingSpinner" style="
                                width: 40px;
                                height: 40px;
                                border: 3px solid rgba(255, 255, 255, 0.1);
                                border-top-color: #00a2ff;
                                border-radius: 50%;
                                animation: spin 0.8s linear infinite;
                            "></div>
                            <img id="gameIcon" style="
                                width: 100%;
                                height: 100%;
                                object-fit: cover;
                                display: none;
                            ">
                        </div>
                        <h2 style="
                            margin: 0 0 12px 0;
                            font-size: 24px;
                            font-weight: 700;
                            color: #fff;
                            letter-spacing: -0.5px;
                        ">Already in a Game</h2>
                        <p style="
                            margin: 0 0 28px 0;
                            font-size: 15px;
                            color: #a0a0a0;
                            line-height: 1.6;
                        ">You are currently playing <strong style="color: #fff; font-weight: 600;">${currentGameData.lastLocation}</strong>. Would you still like to join this server?</p>
                        <div style="display: flex; gap: 12px; justify-content: center; margin-bottom: 20px;">
                            <button id="cancelJoin" style="
                                background: rgba(255, 255, 255, 0.08);
                                color: white;
                                border: 1px solid rgba(255, 255, 255, 0.1);
                                padding: 13px 28px;
                                border-radius: 8px;
                                font-size: 14px;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                letter-spacing: 0.3px;
                            ">Cancel</button>
                            <button id="confirmJoin" style="
                                background: linear-gradient(135deg, #00a2ff 0%, #0088dd 100%);
                                color: white;
                                border: none;
                                padding: 13px 28px;
                                border-radius: 8px;
                                font-size: 14px;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                box-shadow: 0 4px 12px rgba(0, 162, 255, 0.3);
                                letter-spacing: 0.3px;
                            ">Continue</button>
                        </div>
                        <div style="
                            font-size: 11px;
                            color: rgba(255, 255, 255, 0.25);
                            font-weight: 500;
                            letter-spacing: 0.5px;
                        ">RoLocate by Oqarshi</div>
                    </div>
                `;

                // Add keyframe animation for spinner
                const style = document.createElement('style');
                style.textContent = `
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);

                overlay.appendChild(popup);
                document.body.appendChild(overlay);

                // Trigger fade in animation
                setTimeout(() => {
                    overlay.style.opacity = '1';
                    popup.style.transform = 'scale(1)';
                }, 10);

                // Load game icon
                const loadingSpinner = popup.querySelector('#loadingSpinner');
                const gameIconImg = popup.querySelector('#gameIcon');

                try {
                    const universeId = await getUniverseIdFromPlaceId(currentGameData.rootPlaceId);
                    const gameIcon = await getGameIconFromUniverseId(universeId);

                    gameIconImg.src = gameIcon;
                    gameIconImg.onload = () => {
                        loadingSpinner.style.display = 'none';
                        gameIconImg.style.display = 'block';
                    };
                } catch (error) {
                    loadingSpinner.style.display = 'none';
                    // Show placeholder on error
                    popup.querySelector('#gameIconContainer').innerHTML = `
                        <div style="font-size: 60px; opacity: 0.3;">🎮</div>
                    `;
                }

                // Add hover effects
                const cancelBtn = popup.querySelector('#cancelJoin');
                const confirmBtn = popup.querySelector('#confirmJoin');

                cancelBtn.onmouseover = () => {
                    cancelBtn.style.background = 'rgba(255, 255, 255, 0.12)';
                    cancelBtn.style.transform = 'translateY(-1px)';
                };
                cancelBtn.onmouseout = () => {
                    cancelBtn.style.background = 'rgba(255, 255, 255, 0.08)';
                    cancelBtn.style.transform = 'translateY(0)';
                };

                confirmBtn.onmouseover = () => {
                    confirmBtn.style.background = 'linear-gradient(135deg, #0088dd 0%, #0077cc 100%)';
                    confirmBtn.style.transform = 'translateY(-1px)';
                    confirmBtn.style.boxShadow = '0 6px 16px rgba(0, 162, 255, 0.4)';
                };
                confirmBtn.onmouseout = () => {
                    confirmBtn.style.background = 'linear-gradient(135deg, #00a2ff 0%, #0088dd 100%)';
                    confirmBtn.style.transform = 'translateY(0)';
                    confirmBtn.style.boxShadow = '0 4px 12px rgba(0, 162, 255, 0.3)';
                };

                // Fade out animation
                const fadeOut = () => {
                    overlay.style.opacity = '0';
                    popup.style.transform = 'scale(0.9)';
                    setTimeout(() => overlay.remove(), 300);
                };

                // Handle button clicks
                cancelBtn.onclick = () => {
                    fadeOut();
                    setTimeout(() => resolve(false), 300);
                };

                confirmBtn.onclick = () => {
                    fadeOut();
                    setTimeout(() => resolve(true), 300);
                };

            } catch (error) {
                ConsoleLogEnabled(`Error creating popup: ${error}`);
                // Fallback to simple confirm
                resolve(confirm("You are already in a game. Would you like to continue joining this server?"));
            }
        });
    }

    /*******************************************************
    name of function: JoinServer
    description: a function to join servers. has btroblox comptabaility. also join private servers
    *******************************************************/
    async function JoinServer(placeId, serverId, serverType) {
       if (!/^https:\/\/www\.roblox\.com(\/[a-z]{2})?\/(games\/|home(\/|$))/.test(window.location.href)) return; // update cause of the betterfriends function now

        if (localStorage.getItem("ROLOCATE_joinconfirmation") === "true") {
            // checkj if in game
            try {
                const userId = getCurrentUserId();
                const presence = await fetchUserPresence(userId);

                if (presence && presence.gameId) {
                    // show custom pouppu
                    const shouldContinue = await showAlreadyInGamePopup(presence);

                    if (!shouldContinue) {
                        return; // no jioin
                    }
                }
            } catch (error) {
                ConsoleLogEnabled(`Error checking user presence: ${error}`);
                // continue if fails
            }
        }

        // join private server
        if (serverType === "private server") {
            ConsoleLogEnabled(`Joining PRIVATE SERVER`);

            // bypass roblox interceptier
            window._skipRobloxJoinInterceptor = true;

            // join
            Roblox.GameLauncher.joinPrivateGame(placeId, serverId);
            return;
        }

        // mobile mode exception
        if (localStorage.getItem("ROLOCATE_mobilemode") === "true") {
            window.open(
                `https://oqarshi.github.io/Invite/?placeid=${placeId}&serverid=${serverId}&mobilemode=true`,
                "_blank"
            );
            return;
        }
        if (localStorage.getItem("ROLOCATE_btrobloxfix") === "true") {
            /* ---------- recent‑servers handling (always runs) ---------- */
            if (localStorage.getItem("ROLOCATE_togglerecentserverbutton") === "true") {
                await HandleRecentServersAddGames(placeId, serverId);
                document.querySelector(".recent-servers-section")?.remove();
                HandleRecentServers();
            }
            /* ---------- smartserver join---------- */
            if (localStorage.getItem("ROLOCATE_smartjoinpopup") === "true") {
                showLoadingOverlay(placeId, serverId);
                await new Promise(res => setTimeout(res, 1500));
            }
            //join via deeplink
            ConsoleLogEnabled(`Joining via deeplink: placeId=${placeId}, serverId=${serverId}`);
            window.location.href = `roblox://experiences/start?placeId=${placeId}&gameInstanceId=${serverId}`;
        } else {
            // join via roblox launcher
            ConsoleLogEnabled(`Joining via Roblox launcher: placeId=${placeId}, serverId=${serverId}`);
            /* ---------- recent‑servers handling (always runs) ---------- */
            if (localStorage.getItem("ROLOCATE_togglerecentserverbutton") === "true") {
                await HandleRecentServersAddGames(placeId, serverId);
                document.querySelector(".recent-servers-section")?.remove();
                HandleRecentServers();
            }
            /* ---------- smartserver join---------- */
            if (localStorage.getItem("ROLOCATE_smartjoinpopup") === "true") {
                showLoadingOverlay(placeId, serverId);
                await new Promise(res => setTimeout(res, 1500));
            }
            // set flag to bypass interceptor
            window._skipRobloxJoinInterceptor = true;
            Roblox.GameLauncher.joinGameInstance(placeId, serverId);
        }
    }

    /*******************************************************
    name of function: showLoadingOverlay
    description: Loading box when joining a server + Shows server location
    *******************************************************/
    // WARNING: Do not republish this script. Licensed for personal use only.
    async function showLoadingOverlay(gameId, serverId, mainMessage = "", statusMessage = "") {
        // remove existing overlay if present
        const existingOverlay = document.querySelector('[data-loading-overlay]');
        if (existingOverlay) {
            existingOverlay.style.opacity = '0';
            setTimeout(() => existingOverlay.remove(), 200);
        }

        // remove existing styles
        const existingStyle = document.querySelector('[data-loading-overlay-style]');
        if (existingStyle) existingStyle.remove();

        // function to create elements with styles
        const createElement = (tag, styles, content = '') => {
            const el = document.createElement(tag);
            Object.assign(el.style, styles);
            if (content) el.innerHTML = content;
            return el;
        };

        const style = createElement('style', {}, `
            @keyframes progress-slide {
                0% { left: -30%; }
                100% { left: 100%; }
            }
            @keyframes progress-glow {
                0%, 100% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.3); }
                50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6); }
            }
            @keyframes dots {
                0%, 20% { content: ''; }
                40% { content: '.'; }
                60% { content: '..'; }
                80%, 100% { content: '...'; }
            }
            @keyframes fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slide-up {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            @keyframes scale-in {
                from {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.92);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }
        `);
        style.setAttribute('data-loading-overlay-style', '');
        document.head.appendChild(style);

        // main overlay - lighter and no blur
        const overlay = createElement('div', {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: '999999',
            opacity: '0',
            transition: 'opacity 0.5s ease'
        });
        overlay.setAttribute('data-loading-overlay', '');

        // main container - bigger and lighter
        const container = createElement('div', {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) scale(0.92)',
            width: '540px',
            background: '#1a1a1a',
            borderRadius: '18px',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.6)',
            border: '1px solid #2a2a2a',
            padding: '0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            zIndex: '1000000',
            overflow: 'hidden',
            opacity: '0',
            animation: 'scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
        });

        // close button
        const closeButton = createElement('button', {
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: 'none',
            background: '#252525',
            color: '#888',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            outline: 'none',
            zIndex: '10'
        }, '×');

        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.background = '#303030';
            closeButton.style.color = '#fff';
        });
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.background = '#252525';
            closeButton.style.color = '#888';
        });

        // header section with game icon
        const headerSection = createElement('div', {
            display: 'flex',
            alignItems: 'center',
            padding: '32px 32px 24px 32px',
            gap: '20px',
            animation: 'fade-in 0.4s ease 0.2s backwards'
        });

        // game icon - much larger
        const iconContainer = createElement('div', {
            width: '96px',
            height: '96px',
            borderRadius: '16px',
            background: '#252525',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #333',
            overflow: 'hidden',
            flexShrink: '0'
        });

        const defaultLogo = createElement('div', {
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'opacity 0.2s ease'
        }, `<img src="${window.Base64Images.logo}" alt="Logo" width="96" height="96">`);

        const gameIcon = createElement('img', {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'none',
            opacity: '0',
            transition: 'opacity 0.2s ease'
        });

        iconContainer.appendChild(defaultLogo);
        iconContainer.appendChild(gameIcon);

        // text section
        const textSection = createElement('div', {
            flex: '1',
            minWidth: '0'
        });

        const isServerHopping = !gameId || !serverId;
        const titleText = createElement('div', {
            fontSize: '24px',
            fontWeight: '600',
            color: '#fff',
            marginBottom: '6px',
            letterSpacing: '-0.02em'
        }, mainMessage || (isServerHopping ? 'Server Hopping' : 'Joining Game'));

        const dotsSpan = createElement('span', {
            animation: 'dots 1.4s steps(4, end) infinite'
        });
        titleText.appendChild(dotsSpan);

        const subtitleText = createElement('div', {
            fontSize: '14px',
            color: '#aaa',
            fontWeight: '500'
        }, statusMessage || (isServerHopping ? 'Finding available server' : 'Connecting to server'));

        textSection.appendChild(titleText);
        textSection.appendChild(subtitleText);
        headerSection.appendChild(iconContainer);
        headerSection.appendChild(textSection);

        // divider
        const divider = createElement('div', {
            height: '1px',
            background: '#2a2a2a',
            margin: '0 32px'
        });

        // location section
        const locationSection = createElement('div', {
            padding: '24px 32px',
            textAlign: 'center',
            animation: 'slide-up 0.4s ease 0.3s backwards',
            minHeight: '80px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
        });

        const locationLabel = createElement('div', {
            fontSize: '11px',
            color: '#888',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '10px'
        }, 'Server Location');

        const locationValue = createElement('div', {
            fontSize: '20px',
            color: '#fff',
            fontWeight: '600',
            minHeight: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'opacity 0.3s ease'
        }, '🌍 Detecting...');

        locationSection.appendChild(locationLabel);
        locationSection.appendChild(locationValue);

        // server details section
        const detailsSection = createElement('div', {
            padding: '0 32px 24px 32px',
            display: 'flex',
            gap: '12px',
            animation: 'slide-up 0.4s ease 0.4s backwards'
        });

        const createDetail = (label, value, color) => {
            const detail = createElement('div', {
                flex: '1',
                background: '#222',
                border: '1px solid #2a2a2a',
                borderRadius: '10px',
                padding: '14px 16px',
                minWidth: '0'
            });

            const labelEl = createElement('div', {
                fontSize: '11px',
                color: '#888',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '6px'
            }, label);

            const valueEl = createElement('div', {
                fontSize: '13px',
                color: color,
                fontWeight: '600',
                fontFamily: 'monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
            }, value || 'N/A');

            detail.appendChild(labelEl);
            detail.appendChild(valueEl);
            return detail;
        };

        detailsSection.appendChild(createDetail('Game ID', gameId, '#60a5fa'));
        detailsSection.appendChild(createDetail('Server ID', serverId, '#34d399'));

        // progress bar section
        const progressSection = createElement('div', {
            padding: '0 32px 24px 32px',
            animation: 'slide-up 0.4s ease 0.5s backwards'
        });

        const progressBar = createElement('div', {
            height: '4px',
            background: '#252525',
            borderRadius: '2px',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.5)'
        });

        const progressFill = createElement('div', {
            position: 'absolute',
            top: '0',
            left: '-30%',
            height: '100%',
            width: '30%',
            background: 'linear-gradient(90deg, rgba(59, 130, 246, 0) 0%, rgba(59, 130, 246, 0.8) 40%, #3b82f6 50%, rgba(59, 130, 246, 0.8) 60%, rgba(59, 130, 246, 0) 100%)',
            animation: 'progress-slide 2s ease-in-out infinite, progress-glow 2s ease-in-out infinite',
            borderRadius: '2px'
        });

        progressBar.appendChild(progressFill);
        progressSection.appendChild(progressBar);

        // footer
        const footer = createElement('div', {
            padding: '20px 32px',
            borderTop: '1px solid #2a2a2a',
            textAlign: 'center',
            animation: 'fade-in 0.4s ease 0.6s backwards'
        });

        const footerText = createElement('div', {
            fontSize: '11px',
            color: '#666',
            fontWeight: '600',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
        }, 'RoLocate by Oqarshi');

        footer.appendChild(footerText);

        // assemble everything
        container.appendChild(closeButton);
        container.appendChild(headerSection);
        container.appendChild(divider);
        container.appendChild(locationSection);
        container.appendChild(detailsSection);
        container.appendChild(progressSection);
        container.appendChild(footer);
        overlay.appendChild(container);
        document.body.appendChild(overlay);

        // animate in
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });

        // fetch game icon
        if (gameId) {
            getUniverseIdFromPlaceId(gameId)
                .then(universeId => getGameIconFromUniverseId(universeId))
                .then(iconUrl => {
                    gameIcon.src = iconUrl;
                    gameIcon.onload = () => {
                        defaultLogo.style.opacity = '0';
                        setTimeout(() => {
                            defaultLogo.style.display = 'none';
                            gameIcon.style.display = 'block';
                            requestAnimationFrame(() => {
                                gameIcon.style.opacity = '1';
                            });
                        }, 200);
                    };
                    gameIcon.onerror = () => ConsoleLogEnabled('Failed to load game icon');
                })
                .catch(error => ConsoleLogEnabled('Error fetching game icon:', error));
        }

        // fetch server location
        (async () => {
            subtitleText.textContent = statusMessage || (isServerHopping ? 'Finding server...' : 'Locating server...');

            await new Promise(resolve => setTimeout(resolve, 500));

            try {
                if (isServerHopping) {
                    locationValue.innerHTML = '🌍 Random Server';
                    subtitleText.textContent = statusMessage || 'Connecting...';
                } else {
                    const locationData = await fetchServerDetails(gameId, serverId);
                    const flagEmoji = getFlagEmoji(locationData.country.code);
                    locationValue.innerHTML = '';
                    locationValue.appendChild(flagEmoji);
                    locationValue.append(` ${locationData.city}, ${locationData.country.name}`);
                    subtitleText.innerHTML = statusMessage || `Connecting to <span style="color: #60a5fa; font-weight: 600;">${locationData.city}</span>`;
                }
            } catch (error) {
                ConsoleLogEnabled('Error fetching location:', error);
                locationValue.innerHTML = isServerHopping ? '🌍 Random Server' : '🌍 Unknown Location';
                subtitleText.textContent = statusMessage || 'Connecting...';
            }
        })();

        // cleanup function
        const cleanup = () => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                style.remove();
            }, 200);
        };

        // auto hide after 20 seconds for server hopping, 6 seconds for normal join
        const fadeOutDuration = isServerHopping ? 20000 : 6000;
        const fadeOutTimer = setTimeout(cleanup, fadeOutDuration);

        // close button handler
        closeButton.addEventListener('click', () => {
            clearTimeout(fadeOutTimer);
            cleanup();
        });
    }

    function Responsivegamecards() {
        if (localStorage.getItem("ROLOCATE_responsivegamecards") === "false") {
          return;
        }
        // Add styles
        const style = document.createElement('style');
        style.id = 'game-card-hover-styles';
        style.textContent = `
            .game-card-container {
                transition: all 0.25s ease-out !important;
            }

            .game-card-container:hover {
                transform: translateY(-6px) !important;
                box-shadow: 0 8px 20px rgba(0,0,0,0.2) !important;
            }

            .game-card-thumb-container {
                overflow: hidden !important;
            }

            .game-card-thumb-container img {
                transition: transform 0.3s ease !important;
            }

            .game-card-container:hover .game-card-thumb-container img {
                transform: scale(1.08) !important;
            }
        `;
        document.head.appendChild(style);

        // when game cards show up
        new MutationObserver(() => {}).observe(document.body, { childList: true, subtree: true });
    }


    /*******************************************************
     name of function: bettergamestats
     description: popup for customizing game stats display
     *******************************************************/
    function bettergamestats_settings () {
      // don't open it twice
      if (document.getElementById('rolocate-gamestats-settings-modal')) return;
      notifications('Warning: This revenue estimate may be 10–25% higher or lower than the game’s actual earnings and does not account for premium payouts. It is intended to provide a general sense of how much a game makes.', 'warning', '', '60000');

      // default toggle values
      const defaultSettings = {
        estimatedRevenue: false
      };

      // load saved settings and fall back to defaults
      const savedSettings = JSON.parse(
        localStorage.getItem('ROLOCATE_bettergamestats_settings') || '{}'
      );
      const settings = { ...defaultSettings, ...savedSettings };

      // dark background overlay
      const overlay = document.createElement('div');
      overlay.id = 'rolocate-gamestats-settings-modal';
      overlay.style.cssText = `
        position:fixed;inset:0;display:flex;justify-content:center;align-items:center;
        background:rgba(0,0,0,.45);z-index:10000;opacity:0;transition:.2s;
      `;

      // main modal box
      const modal = document.createElement('div');
      modal.style.cssText = `
        background:#181818;border-radius:14px;padding:18px;width:340px;max-width:92vw;
        color:#fff;border:1px solid #2f2f2f;box-shadow:0 10px 30px rgba(0,0,0,.6);
        transform:scale(.96) translateY(12px);transition:.2s;
      `;

      // title + subtitle
      modal.innerHTML = `
        <h2 style="margin:0;font-size:18px;text-align:center">Game Stats Settings</h2>
        <p style="margin:6px 0 0px;text-align:center;font-size:12px;color:#aaa">
          Choose what you want displayed
        </p>
      `;

      // toggle definitions
      const toggleOptions = [
        ['estimatedRevenue', 'Estimated Revenue']
      ];

      // container for all toggles
      const togglesContainer = document.createElement('div');
      togglesContainer.style.cssText = `
        background:#222;padding:10px;border-radius:10px;display:grid;gap:8px;
      `;

      // build each toggle row
      toggleOptions.forEach(([key, label]) => {
        const row = document.createElement('label');
        row.style.cssText = `
          display:flex;justify-content:space-between;align-items:center;
          padding:8px 10px;border-radius:8px;cursor:pointer;
          transition:.15s;background:#262626;
        `;

        // hover effect
        row.onmouseenter = () => (row.style.background = '#2d2d2d');
        row.onmouseleave = () => (row.style.background = '#262626');

        const on = settings[key];
        row.innerHTML = `
          <span style="font-size:13px">${label}</span>
          <input type="checkbox" id="bgs-${key}" ${on ? 'checked' : ''} style="display:none">
          <div class="tgl" style="
            width:36px;height:20px;border-radius:20px;
            background:${on ? '#16a34a' : '#444'};
            position:relative;transition:.15s;
          ">
            <div style="
              width:16px;height:16px;border-radius:50%;background:#fff;
              position:absolute;top:2px;left:${on ? '18px' : '2px'};
              transition:.15s;
            "></div>
          </div>
        `;

        const checkbox = row.querySelector('input');
        const toggle = row.querySelector('.tgl');
        const knob = toggle.querySelector('div');

        // handle toggle click
        row.onclick = (e) => {
          e.preventDefault();
          checkbox.checked = !checkbox.checked;
          toggle.style.background = checkbox.checked ? '#16a34a' : '#444';
          knob.style.left = checkbox.checked ? '18px' : '2px';
        };

        togglesContainer.appendChild(row);
      });

      // buttons container
      const buttonRow = document.createElement('div');
      buttonRow.style.cssText = `
        display:flex;justify-content:flex-end;gap:8px;margin-top:14px;
      `;

      // close animation + cleanup
      const closeModal = () => {
        modal.style.transform = 'scale(.96) translateY(12px)';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 200);
      };

      // reusable button factory
      const createButton = (text, bgColor, onClick) => {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
          padding:8px 14px;border-radius:8px;border:1px solid ${bgColor};
          background:${bgColor};color:#fff;font-size:13px;cursor:pointer;
          transition:.15s;
        `;
        button.onmouseenter = () => (button.style.opacity = 0.85);
        button.onmouseleave = () => (button.style.opacity = 1);
        button.onclick = onClick;
        return button;
      };

      // add buttons
      buttonRow.append(
        createButton('Cancel', '#333', closeModal),
        createButton('Save', '#16a34a', () => {
          const newSettings = {};
          toggleOptions.forEach(([key]) => {
            newSettings[key] = document.getElementById(`bgs-${key}`).checked;
          });

          localStorage.setItem(
            'ROLOCATE_bettergamestats_settings',
            JSON.stringify(newSettings)
          );

          // feedback stuff
          ConsoleLogEnabled('Game stats settings saved:', newSettings);
          notifications('Settings saved', 'success', '👍', '5000');

          closeModal();
        })
      );

      // assemble modal
      modal.append(togglesContainer, buttonRow);
      overlay.append(modal);
      document.body.append(overlay);

      // animate in
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'scale(1) translateY(0)';
      });
    }

    /*******************************************************
    name of function: getCsrfToken
    description: get crsf token
    *******************************************************/
    // NOTE NOTE NOTE: DO NOT CONSOLE LOG THE CSRF TOKEN!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    async function getCsrfToken() { // look ik this function may get called like a million times. but shouldnt be an issue. :) real men test in production >:)
        return new Promise((resolve) => {
            GM_xmlhttpRequest({ // low risk endpoint. hopefully no ratelimit
                url: "https://catalog.roblox.com/v1/catalog/items/details",
                method: "POST",
                withCredentials: true,
                onload: function(response) {
                    const token = response.responseHeaders
                        .split("\n")
                        .find(h => h.toLowerCase().startsWith("x-csrf-token"));

                    if (!token) {
                        ConsoleLogEnabled("Error: Something went wrong getting csrf token!");
                        resolve(null);
                        return;
                    }

                    const value = token.split(":")[1].trim();
                    resolve(value);
                },
                onerror: function() {
                    ConsoleLogEnabled("Error: Request failed while getting csrf token!");
                    resolve(null);
                }
            });
        });
    }

    /*******************************************************
    name of function: checkBannedUser
    description: so like this is the banned user logic. coming soonish
    *******************************************************/
    async function checkBannedUser() {
        function check() {
            if (!location.href.includes("ROLOCATE_BANNED_USER")) return;
            const container = document.querySelector(".profile-platform-container");
            if (!container) return;
            const textColor = isDarkMode() ? "#ffffff" : "#000000";
            container.innerHTML = `
                <p style="color:${textColor};padding:24px;text-align:center;margin:0;font-size:24px;font-weight:600;">
                    🛠️ Coming Soon-ish
                </p>
            `;
        }

        // logic so on page updates
        for (const method of ["pushState", "replaceState"]) {
            const orig = history[method];
            history[method] = function (...a) { orig.apply(this, a); check(); };
        }
        window.addEventListener("popstate",   check);
        window.addEventListener("hashchange", check);
        check();
    }

    /*******************************************************
    name of function: event listener
    description: Not a function but runs the initial setup for the script to actually
    start working. Very important
    *******************************************************/
    window.addEventListener("load", () => {
        const startTime = performance.now();

        loadBase64Library(() => {
            ConsoleLogEnabled("Loaded Base64Images. It is ready to use!");
        });

        loadServerRegions(() => {
            ConsoleLogEnabled("Loaded Server Regions!");
        });

        AddSettingsButton(() => {
            ConsoleLogEnabled("Loaded Settings button!");
        });

        if (localStorage.getItem("ROLOCATE_togglerecentserverbutton") === "true") {
            HandleRecentServersURLandTrackPresence(); // starts presence tracking for recent servers
        }

        betterfriends(); // shows better friends
        checkBannedUser(); // banned user
        Responsivegamecards(); // uh the repsonsive game cards
        SmartSearch(); // smartsearch bar ontop cool function :)
        applycustombackgrounds(); // applies custom backgrounds
        restoreclassicterms(); // restores classic terms
        quicklaunchgamesfunction(); // shows quick launch games
        manageRobloxChatBar(); // removes chatbar if enabled
        loadbetterprofileinfo(); // shows mutualfriends, accountage, etc
        Update_Popup(); // shows update message
        initializeLocalStorage(); // sets up localstorage
        removeAds(); // removes ads
        showOldRobloxGreeting(); // shows old greeting
        validateManualMode(); // checks for manual mode
        qualityfilterRobloxGames(); // filters roblox game if it is on

        // start observing URL changes cuase its cool
        observeURLChanges();

        const endTime = performance.now();
        const elapsed = Math.round(endTime - startTime);

        // add small delay
        setTimeout(() => {
            const endTime = performance.now();
            const elapsed = Math.round(endTime - startTime);
            console.log(`%cRoLocate by Oqarshi - loaded in ${elapsed} ms. Personal use only.`, "color: #FFD700; font-size: 18px; font-weight: bold;");
        }, 10);
    });

    /*******************************************************
    name of function: mobile stuff #1
    description: mobile mode thing. if mobile mode true and not in game link then show notification.
    *******************************************************/

    if (localStorage.ROLOCATE_mobilemode === "true" && !location.href.match(/^https:\/\/www\.roblox\.com(\/[a-z]{2})?\/games\//)) {
        const observer = new MutationObserver(() => {
            document.querySelectorAll('a[href*="/games/"]').forEach(link => {
                if (link.dataset.mobileModeAttached) return;
                link.dataset.mobileModeAttached = "true";
                link.addEventListener("click", () => notifications('Tap the "Cancel" button', 'info', '❗', '60000'));
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    /*******************************************************
    name of function: mobile stuff #2
    description: mobile mode thingy so that servers can show on mobile devices. this is so scuffed lmao
    *******************************************************/
    if (localStorage.ROLOCATE_mobilemode === "true" && /^https:\/\/www\.roblox\.com(\/[a-z]{2})?\/games\//.test(location.href)) {
      if (!location.href.includes("#!/game-instances")) {
        // not yet on game-instance
        notifications('Mobile Mode is Enabled. Some features may be disabled.', 'info', 'ℹ️', '6000');
        setTimeout(() => {
          location.replace(location.href + "#!/game-instances");
        }, 1000);
      } else {
        // after on game-instance
        notifications('Mobile Mode is Enabled. Some features may be disabled.', 'info', 'ℹ️', '6000');
      }
    }

    /*******************************************************
    name of function: mobile stuff #3
    description: so like if on roblox.com where says go to app, tell user to not do that
    *******************************************************/
    if (localStorage.ROLOCATE_mobilemode === "true" && location.href.match(/^https:\/\/www\.roblox\.com\/?$/)) {
        notifications('Tap "Continue in browser"', 'info', '❗', '30000');
    }

    /*******************************************************
    name of function: mobile stuff experimental #5
    description: so like if on roblox.com where says go to app, tell user to not do that
    *******************************************************/
    // RoLocate Loading Screen - Run immediately, before page loads
    if (localStorage.ROLOCATE_mobilemode === "true" && location.href.match(/^https:\/\/www\.roblox\.com(\/[a-z]{2})?\/home/)) {
        // Inject styles immediately in head
        const style = document.createElement('style');
        style.textContent = `
            #rolocate-loading-screen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #000;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 999999;
                opacity: 1;
                transition: opacity 0.6s ease;
            }
            #rolocate-loading-screen.fade-out {
                opacity: 0;
            }
            .rolocate-loading-content {
                text-align: center;
            }
            .rolocate-logo-text-container {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 15px;
                margin-bottom: 15px;
            }
            .rolocate-logo {
                width: 50px;
                height: 50px;
                border-radius: 8px;
                transform: translate(10px, -5px);
                opacity: 0;
                animation: rolocate-logo-fade 0.5s ease-in-out 0.3s forwards;
            }
            .rolocate-svg {
                width: 250px;
                height: auto;
            }
            .rolocate-text {
                font-size: 48px;
                font-weight: 700;
                font-family: Arial, sans-serif;
                fill: #ff4757;
                opacity: 0;
                animation: rolocate-text-fade 0.5s ease-in-out 0.5s forwards;
            }
            .rolocate-subtitle {
                font-size: 20px;
                font-weight: 400;
                font-family: Arial, sans-serif;
                color: #888;
                opacity: 0;
                margin: 0;
                animation: rolocate-fade-in 0.8s ease-in-out 1.2s forwards;
            }
            @keyframes rolocate-logo-fade {
                to {
                    opacity: 1;
                }
            }
            @keyframes rolocate-text-fade {
                to {
                    opacity: 1;
                }
            }
            @keyframes rolocate-fade-in {
                to {
                    opacity: 0.6;
                }
            }
        `;
        document.head.appendChild(style);
        // Create loading screen HTML
        const loadingScreen = document.createElement('div');
        loadingScreen.id = 'rolocate-loading-screen';
        loadingScreen.innerHTML = `
            <div class="rolocate-loading-content">
                <div class="rolocate-logo-text-container">
                    <img src="${window.Base64Images.logo}" alt="RoLocate Logo" class="rolocate-logo">
                    <svg viewBox="0 0 250 60" class="rolocate-svg">
                        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" class="rolocate-text">
                            RoLocate
                        </text>
                    </svg>
                </div>
                <p class="rolocate-subtitle">For Mobile</p>
            </div>
        `;
        // Add to body immediately
        document.body.insertBefore(loadingScreen, document.body.firstChild);
        // Fade out after 3 seconds
        setTimeout(() => {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.remove();
                style.remove();
            }, 600);
        }, 3000);
    }

    /*******************************************************
    The code for the random hop button and the filter button on roblox.com/games/*
    *******************************************************/
        if (
            window.location.href.includes("/games/") &&
            (
                localStorage.getItem("ROLOCATE_togglefilterserversbutton") === "true" ||
                localStorage.getItem("ROLOCATE_toggleserverhopbutton") === "true" ||
                localStorage.getItem("ROLOCATE_togglerecentserverbutton") === "true" ||
                localStorage.getItem("ROLOCATE_betterprivateservers") == "true"
            )
        ) {

        let Isongamespage = true;

        if (window.location.href.includes("/games/")) { // saftey check and lazy load data to save the 2mb of ram lmao
            InitRobloxLaunchHandler();

            if (window.serverRegionsByIp) {
                ConsoleLogEnabled("enabled roblox launch handler");
            } else {
                ConsoleLogEnabled("failed to enable roblox launch handler");
            }
            getFlagEmoji(); // lazy loads the flag emoji base64 to save some ram i guess
        }

        /*******************************************************
        name of function:monitorPlayButton
        description: for join confimation and like future updates note that it is called if the jopinconfimation in localstop4arghe is true so not check needed here
        *******************************************************/
        function monitorPlayButton() {
            const button = document.querySelector('[data-testid="play-button"]');
            if (!button) return;

            async function onPlayClick(event) {
                //intercept real clicks
                if (!event.isTrusted) {
                    return; // let program clicks
                }

                event.preventDefault();
                event.stopImmediatePropagation();

                try {
                    const userId = getCurrentUserId();
                    const presence = await fetchUserPresence(userId);
                    if (presence && presence.gameId) {
                        const shouldContinue = await showAlreadyInGamePopup(presence);
                        if (!shouldContinue) return;
                    }
                } catch (error) {
                    ConsoleLogEnabled('Error checking user presence:', error);
                }

                // Uok so rel click
                button.click();
            }

            button.addEventListener('click', onPlayClick, true);
        }



        /*******************************************************
        name of function: InitRobloxLaunchHandler
        description: Detects when the user joins a Roblox server,
        adds it to recent servers (if enabled), and only when
        SmartSearch is on shows a loading overlay and waits 1.5s.
        *******************************************************/
        function InitRobloxLaunchHandler() {
            if (localStorage.getItem("ROLOCATE_btrobloxfix") === "true" || localStorage.getItem("ROLOCATE_mobilemode") === "true") {
                return;
            }
            if (!/^https:\/\/www\.roblox\.com(\/[a-z]{2})?\/games\//.test(window.location.href)) return;
            if (window._robloxJoinInterceptorInitialized) return;
            window._robloxJoinInterceptorInitialized = true;
            const originalJoin = Roblox.GameLauncher.joinGameInstance;
            Roblox.GameLauncher.joinGameInstance = async function(gameId, serverId) {
                // check if we should skip interception (called from JoinServer)
                if (window._skipRobloxJoinInterceptor) {
                    window._skipRobloxJoinInterceptor = false; // reset flag
                    return originalJoin.apply(this, arguments);
                }

                if (localStorage.getItem("ROLOCATE_joinconfirmation") === "true") {
                    // check if in game
                    try {
                        const userId = getCurrentUserId();
                        const presence = await fetchUserPresence(userId);

                        if (presence && presence.gameId) {
                            // show the popup
                            const shouldContinue = await showAlreadyInGamePopup(presence);

                            if (!shouldContinue) {
                                return;
                            }
                        }
                    } catch (error) {
                        ConsoleLogEnabled(`Error checking user presence: ${error}`);
                        // contineu if presense fails
                    }
                }

                ConsoleLogEnabled(`Intercepted join: Game ID = ${gameId}, Server ID = ${serverId}`);
                /* ---------- recent‑servers handling (always runs) ---------- */
                if (localStorage.getItem("ROLOCATE_togglerecentserverbutton") === "true") {
                    await HandleRecentServersAddGames(gameId, serverId);
                    document.querySelector(".recent-servers-section")?.remove();
                    HandleRecentServers();
                }
                /* ---------- smartserver join---------- */
                if (localStorage.getItem("ROLOCATE_smartjoinpopup") === "true") {
                    showLoadingOverlay(gameId, serverId);
                    await new Promise(res => setTimeout(res, 1500));
                }
                /* ---------- finally join the game ---------- */
                return originalJoin.apply(this, arguments);
            };
        }

        /*******************************************************
        name of function: disableYouTubeAutoplayInIframes
        Description:
        disable autoplay in YouTube iframes on game page & new video blob thingy
        *******************************************************/
        function disableVideoAutoplay(rootElement = document, observeMutations = true) {
            const processedFlag = 'data-autoclicked';

            function findAndClickPlay() {
                const playButton = document.querySelector('button[aria-label="Pause"]');
                if (playButton && !playButton.hasAttribute(processedFlag)) {
                    playButton.setAttribute(processedFlag, 'true');
                    playButton.click();
                    return true;
                }
                return false;
            }

            // Run immediately in case button is already in the DOM
            if (findAndClickPlay()) return;

            if (observeMutations) {
                const observer = new MutationObserver(() => {
                    if (findAndClickPlay()) {
                        observer.disconnect();
                    }
                });

                observer.observe(rootElement.body || rootElement, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['aria-label']
                });

                return observer;
            }
        }
        /*******************************************************
         name of function: bettergamestats_action
         description: calculates estimated revenue range for the
         current game based on genre RPV benchmarks.
         formula: visits * RPV * 0.70 * 0.0038
         *******************************************************/
        async function bettergamestats_action() {
          const enabled = localStorage.getItem('ROLOCATE_bettergamestats');
          if (!enabled || enabled !== 'true') return;

          const rawSettings = localStorage.getItem('ROLOCATE_bettergamestats_settings');
          const settings = rawSettings ? JSON.parse(rawSettings) : {};
          if (!settings.estimatedRevenue) return;

          // rpv range by genre
          // keyed by lowercase genre_l1, with optional genre_l2 overrides
          // [min, max] RPV in Robux
          const RPV_BY_GENRE = {
            shooter:    { default: [3.5, 7.0] },
            action: {
              default:       [4.5, 8.5],
              battlegrounds: [4.0, 8.5],
              'open world':  [5.0, 9.0],
              'battle royale': [4.0, 8.5],
            },
            rpg: {
              default:  [5.0, 9.0],
              action:   [6.0, 12.0],
              survival: [4.0, 7.5],
            },
            simulation: {
              default: [2.5, 5.0],
              tycoon:  [1.5, 2.5],
              idle:    [3.5, 7.5],
              pet:     [3.5, 7.5],
            },
            roleplay: {
              default:    [1.5, 3.5],
              social:     [0.5, 1.5],
              specialized:[2.5, 5.0],
              life:       [0.5, 2.0],
            },
            strategy:   { default: [3.0, 7.5] },
            horror:     { default: [2.0, 4.5] },
            survival:   { default: [1.5, 3.5] },
            obby:       { default: [0.1, 0.5] },
            platformer: { default: [0.1, 0.5] },
            // fallback
            _unknown:   { default: [2.0, 5.0] },
          };

          function getRpvRange(genre_l1, genre_l2) {
            const g1 = (genre_l1 || '').toLowerCase();
            const g2 = (genre_l2 || '').toLowerCase();

            const genreEntry = RPV_BY_GENRE[g1] ?? RPV_BY_GENRE._unknown;

            // check if any genre_l2 keyword matches a subgenre key
            const subKey = Object.keys(genreEntry).find(k => k !== 'default' && g2.includes(k));

            return subKey ? genreEntry[subKey] : genreEntry.default;
          }

          // helpers
          const gmFetch = url => new Promise((resolve, reject) =>
            GM_xmlhttpRequest({
              method: 'GET', url,
              onload: r => resolve(r.responseText),
              onerror: err => reject(err),
            })
          );

          function upsertStat(labelText, valueText) {
            const container = document.querySelector('ul.game-stat-container');
            if (!container) return;
            let el = [...container.querySelectorAll('.game-stat')]
              .find(li => li.querySelector('.text-label')?.textContent === labelText);
            if (el) { el.querySelector('.text-lead').textContent = valueText; return; }
            const li = document.createElement('li');
            li.className = 'game-stat';
            li.innerHTML = `
              <p class="text-label text-overflow font-caption-header">${labelText}</p>
              <p class="text-lead font-caption-body">${valueText}</p>
            `;
            container.appendChild(li);
          }

          // money compactereretrter
          function fmtUSD(n) {
            if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
            if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
            if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
            return '$' + Math.round(n);
          }

          const wait = ms => new Promise(res => setTimeout(res, ms));

          // get game data
          const placeId = getCurrentGameId();
          const universeId = await getUniverseIdFromPlaceId(placeId);
          ConsoleLogEnabled('[bettergamestats] universeId:', universeId);

          let visits = 0, genre_l1 = '', genre_l2 = '';
          try {
            const res  = await gmFetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
            const data = JSON.parse(res);
            const game = data.data?.[0];
            if (!game) return;

            visits   = game.visits ?? 0;
            genre_l1 = game.genre_l1 ?? '';
            genre_l2 = game.genre_l2 ?? '';

            ConsoleLogEnabled('[bettergamestats] visits:', visits);
            ConsoleLogEnabled('[bettergamestats] genre_l1:', genre_l1, '| genre_l2:', genre_l2);
          } catch (e) {
            ConsoleLogEnabled('[bettergamestats] failed to fetch game info:', e);
            return;
          }

          if (visits <= 0) return;

          // get dev products
          await wait(100);
          let hasDevProducts = false;
          try {
            const dpRes  = await gmFetch(`https://apis.roblox.com/developer-products/v2/universes/${universeId}/developerproducts?limit=500`);
            const dpData = JSON.parse(dpRes);
            hasDevProducts = (dpData.developerProducts || []).some(p => p.PriceInRobux > 0);
            ConsoleLogEnabled('[bettergamestats] hasDevProducts:', hasDevProducts);
          } catch (e) {
            ConsoleLogEnabled('[bettergamestats] failed to fetch dev products:', e);
          }

          // get gamepasses
          await wait(100);
          let hasGamePasses = false;
          try {
            const gpRes  = await gmFetch(`https://apis.roblox.com/game-passes/v1/universes/${universeId}/game-passes?passView=full`);
            const gpData = JSON.parse(gpRes);
            hasGamePasses = (gpData.gamePasses || []).some(p => p.price > 0);
            ConsoleLogEnabled('[bettergamestats] hasGamePasses:', hasGamePasses);
          } catch (e) {
            ConsoleLogEnabled('[bettergamestats] failed to fetch game passes:', e);
          }

          const noMonetization = !hasDevProducts && !hasGamePasses;
          ConsoleLogEnabled('[bettergamestats] noMonetization (0.1x):', noMonetization);

          // revenue range
          const [rpvMin, rpvMax] = getRpvRange(genre_l1, genre_l2);
          const calc = rpv => visits * rpv * 0.70 * 0.0038;

          // ouitler multipler
          // top games attract more robux montezization really good
          let outlierMultiplier;
          if      (visits >= 100_000_000_000) outlierMultiplier = 3.8;
          else if (visits >=  50_000_000_000) outlierMultiplier = 3.3;
          else if (visits >=  20_000_000_000) outlierMultiplier = 3.0;
          else if (visits >=  10_000_000_000) outlierMultiplier = 2.3;
          else if (visits >=   5_000_000_000) outlierMultiplier = 1.5;
          else if (visits >=   1_000_000_000) outlierMultiplier = 1.2;
          else                                outlierMultiplier = 1.0;

          ConsoleLogEnabled('[bettergamestats] outlierMultiplier:', outlierMultiplier);

          const monetizationMultiplier = noMonetization ? 0.1 : 1;
          const combined = monetizationMultiplier * outlierMultiplier;
          const revenueMin = Math.round(calc(rpvMin) * combined);
          const revenueMax = Math.round(calc(rpvMax) * combined);

          ConsoleLogEnabled('[bettergamestats] RPV range:', rpvMin, '–', rpvMax);
          ConsoleLogEnabled('[bettergamestats] Est. Revenue range:', revenueMin, '–', revenueMax);

          upsertStat('Est. Revenue', `${fmtUSD(revenueMin)} – ${fmtUSD(revenueMax)}`);
        }
        /*******************************************************
        name of function: cleanupPrivateServerCards
        Description:
        compacts private servers so they don't take up so much space
        *******************************************************/
        function cleanupPrivateServerCards() {
          if (localStorage.ROLOCATE_betterprivateservers !== "true") return;
          if (cleanupPrivateServerCards._initialized) return;
          cleanupPrivateServerCards._initialized = true;

          let isRunning = false, searchBar = null, currentSearchQuery = '';

          const getSettings = () => ({
            compactPrivateServers: true,
            onlyYourPrivateServers: false,
            privateServerSearch: false,
            ...JSON.parse(localStorage.getItem('ROLOCATE_editprivateserversettings') || '{}')
          });

          const applySearchFilter = (query) => {
            currentSearchQuery = query;
            document.querySelectorAll('.card-item-private-server').forEach(card => {
              const parentLi = card.closest('li');
              const serverName = card.querySelector('.section-header .font-bold')?.textContent.toLowerCase() || '';
              const ownerName = card.querySelector('.rbx-private-owner .text-name')?.textContent.toLowerCase() || '';
              const show = !query || serverName.includes(query) || ownerName.includes(query);
              (parentLi || card).style.display = show ? '' : 'none';
            });
            updateFilterBadge();
          };

          const updateFilterBadge = () => {
            const container = document.getElementById('rolocate-ps-search-container');
            if (!container) return;
            let badge = document.getElementById('rolocate-ps-filter-badge');
            if (currentSearchQuery) {
              if (!badge) {
                badge = document.createElement('div');
                badge.id = 'rolocate-ps-filter-badge';
                badge.style.cssText = `display:inline-flex;align-items:center;gap:6px;padding:8px 12px;background:rgba(77,133,238,.15);border:1px solid rgba(77,133,238,.3);border-radius:8px;color:#4d85ee;font-size:13px;font-weight:600;margin-left:8px`;
                const text = document.createElement('span');
                text.id = 'rolocate-ps-filter-text';
                const closeBtn = document.createElement('span');
                closeBtn.textContent = '×';
                closeBtn.style.cssText = `cursor:pointer;font-size:18px;font-weight:700;line-height:1;opacity:.7;transition:opacity .2s`;
                closeBtn.onmouseenter = () => closeBtn.style.opacity = '1';
                closeBtn.onmouseleave = () => closeBtn.style.opacity = '0.7';
                closeBtn.onclick = () => { currentSearchQuery = ''; applySearchFilter(''); };
                badge.appendChild(text);
                badge.appendChild(closeBtn);
                container.appendChild(badge);
              }
              document.getElementById('rolocate-ps-filter-text').textContent = `Filter: "${currentSearchQuery}"`;
            } else {
              badge?.remove();
            }
          };

          const createSearchButton = () => {
            if (searchBar) return searchBar;
            const container = document.createElement('div');
            container.id = 'rolocate-ps-search-container';
            container.style.cssText = `display:inline-flex;align-items:center;margin-bottom:15px;margin-left:9px`;
            const button = document.createElement('button');
            button.id = 'rolocate-ps-search-button';
            button.innerHTML = '🔍 Search Private Servers';
            button.className = 'btn-secondary-md';
            button.style.cssText = `padding:10px 18px;background:transparent;border:1px solid rgba(150,150,150,.3);border-radius:8px;color:#a0a8b8;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:6px`;
            button.onmouseenter = () => { button.style.background='rgba(77,133,238,.15)'; button.style.borderColor='rgba(77,133,238,.3)'; button.style.color='#4d85ee'; };
            button.onmouseleave = () => { button.style.background='transparent'; button.style.borderColor='rgba(150,150,150,.3)'; button.style.color='#a0a8b8'; };
            button.onclick = () => showSearchPopup();
            container.appendChild(button);
            searchBar = container;
            return container;
          };

          // keep clicking "Load More" until it disappears, then run callback
          const loadAllServers = (onDone) => {
            const clickNext = () => {
              const loadMoreBtn = document.querySelector('.rbx-private-running-games-footer .rbx-running-games-load-more');
              if (!loadMoreBtn) { onDone(); return; }
              loadMoreBtn.click();
              setTimeout(clickNext, 600); // 600 ms delay
            };
            clickNext();
          };

          // the show popup function
          const showSearchPopup = () => {
            const overlay = document.createElement('div');
            overlay.className = 'search-popup-overlay';
            const box = document.createElement('div');
            box.className = 'search-popup-content';

            const title = document.createElement('h3');
            title.textContent = 'Search Private Servers';
            title.style.cssText = `margin:0 0 20px 0;color:#e8ecf3;font-size:20px;font-weight:700;text-align:center`;

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'Search by server name or owner...';
            input.id = 'rolocate-ps-search-input-popup';
            input.value = currentSearchQuery;
            input.style.cssText = `width:100%;padding:14px 16px;background:rgba(28,31,37,.6);border:1px solid rgba(77,133,238,.3);border-radius:8px;color:#e8ecf3;font-size:15px;font-weight:600;outline:none;transition:border-color .2s;box-sizing:border-box`;
            input.onfocus = () => input.style.borderColor = 'rgba(77,133,238,.6)';
            input.onblur  = () => input.style.borderColor = 'rgba(77,133,238,.3)';
            input.oninput = (e) => { currentSearchQuery = e.target.value.toLowerCase().trim(); };

            const close = document.createElement('button');
            close.className = 'search-popup-close btn-secondary-md';
            close.textContent = 'Close';

            const closeOverlay = () => {
              // load all servers then filter when user closes
              if (currentSearchQuery) {
                close.textContent = 'Finding Server...';
                close.disabled = true;
                input.disabled = true;
                loadAllServers(() => {
                  applySearchFilter(currentSearchQuery);
                  overlay.classList.add('fade-out');
                  overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
                });
              } else {
                applySearchFilter('');
                overlay.classList.add('fade-out');
                overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
              }
            };

            close.onclick = closeOverlay;
            overlay.onclick = e => e.target === overlay && closeOverlay();
            box.addEventListener('click', e => e.stopPropagation());

            box.appendChild(title);
            box.appendChild(input);
            box.appendChild(close);
            overlay.appendChild(box);
            document.body.appendChild(overlay);
            setTimeout(() => input.focus(), 100);
          };

          // search abr
          const insertSearchBar = () => {
            const settings = getSettings();
            if (!settings.privateServerSearch) {
              document.getElementById('rolocate-ps-search-container')?.remove();
              searchBar = null;
              return;
            }
            const serverList = document.querySelector('#rbx-private-running-games');
            if (!serverList || document.getElementById('rolocate-ps-search-container')) return;
            const container = createSearchButton();
            serverList.insertBefore(container, serverList.firstChild);
            updateFilterBadge();
          };

          const showPlayersPopup = (thumbs) => {
            const overlay = document.createElement('div');
            overlay.className = 'players-popup-overlay';
            const box = document.createElement('div');
            box.className = 'players-popup-content';
            box.innerHTML = '<h3 style="font-size:1.4em">Players in Server</h3>';

            if (thumbs?.querySelector('img')) {
              Object.assign(thumbs.style, { display:'flex', justifyContent:'center', flexWrap:'wrap' });
              thumbs.querySelectorAll('a').forEach(l => { l.target='_blank'; l.rel='noopener noreferrer'; });
              thumbs.addEventListener('click', e => e.stopPropagation());
              box.appendChild(thumbs);
            } else {
              const noP = document.createElement('p');
              noP.innerHTML = '<b style="font-size:1.2em">No players currently in this server.</b><br><span style="color:gray;font-size:1.0em">RoLocate: To disable: Settings -> Appearance -> Better Private Servers.</span>';
              box.appendChild(noP);
            }

            const close = document.createElement('button');
            close.className = 'players-popup-close btn-secondary-md';
            close.textContent = 'Close';
            const closeOverlay = () => { overlay.classList.add('fade-out'); overlay.addEventListener('animationend', () => overlay.remove(), { once: true }); };
            close.onclick = closeOverlay;
            overlay.onclick = e => e.target === overlay && closeOverlay();
            box.addEventListener('click', e => e.stopPropagation());
            box.appendChild(close);
            overlay.appendChild(box);
            document.body.appendChild(overlay);
          };

          const performCleanup = () => {
            if (isRunning) return;
            isRunning = true;

            const settings = getSettings();
            const currentUserId = getCurrentUserId();
            insertSearchBar();

            document.querySelectorAll('.card-item-private-server').forEach(card => {
              const parentLi = card.closest('li');

              if (settings.onlyYourPrivateServers) {
                const href = card.querySelector('.rbx-private-owner a[href*="/users/"]')?.getAttribute('href');
                const match = href?.match(/\/users\/(\d+)\//);
                if (match && match[1] !== currentUserId.toString()) {
                  (parentLi || card).style.display = 'none';
                  return;
                }
              } else if (!currentSearchQuery) {
                (parentLi || card).style.display = '';
              }

              if (settings.compactPrivateServers) {
                const thumbs = card.querySelector('.player-thumbnails-container');
                if (thumbs) thumbs.remove();
                card.querySelector('.rbx-private-game-server-details')?.classList.remove('game-server-details', 'border-right');
                const joinBtn = card.querySelector('.rbx-private-game-server-join');
                if (joinBtn && !card.querySelector('.rolocate-view-players-btn')) {
                  const btn = document.createElement('button');
                  btn.textContent = 'View Players';
                  btn.className = 'btn-full-width btn-control-xs rolocate-view-players-btn btn-secondary-md btn-min-width';
                  btn.style.marginTop = '6px';
                  joinBtn.after(btn);
                  btn.addEventListener('click', () => showPlayersPopup(thumbs?.cloneNode(true)));
                }
              }
            });

            if (currentSearchQuery) applySearchFilter(currentSearchQuery);

            if (settings.compactPrivateServers)
              document.querySelectorAll('.rbx-private-game-server-item').forEach(i => i.classList.remove('rbx-private-game-server-item'));

            if (!document.getElementById('private-server-cleanup-styles')) {
              const s = document.createElement('style');
              s.id = 'private-server-cleanup-styles';
              s.textContent = `
                .card-item-private-server{display:inline-block;width:auto;max-width:250px;min-width:200px}
                #rbx-private-game-server-item-container li{display:inline-block;width:auto!important;float:none}
                .rbx-private-game-server-item-container{display:flex;flex-wrap:wrap;gap:10px}
                .players-popup-overlay,.search-popup-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:9999;animation:fadeIn .2s ease-out;opacity:1}
                .players-popup-content{background:rgba(20,22,26,.95);color:#e8ecf3;border-radius:12px;padding:20px;max-width:400px;width:90%;box-shadow:0 10px 25px rgba(0,0,0,.3);border:1px solid rgba(77,133,238,.2);text-align:center;transform:scale(.95);animation:popIn .2s ease-out forwards}
                .players-popup-content h3{margin-top:0;color:#e8ecf3;font-size:16px;font-weight:600;margin-bottom:16px}
                .players-popup-content p{color:#a0a8b8;font-size:13px;line-height:1.5;margin-bottom:24px}
                .players-popup-content .player-thumbnails-container{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:10px}
                .players-popup-close{margin-top:15px;padding:8px 20px;cursor:pointer;background:rgba(28,31,37,.6);color:#e8ecf3;border:1px solid rgba(255,255,255,.12);border-radius:6px;font-size:13px;font-weight:500;transition:.2s}
                .search-popup-content{background:rgba(20,22,26,.95);color:#e8ecf3;border-radius:12px;padding:30px;max-width:400px;width:20%;box-shadow:0 10px 25px rgba(0,0,0,.3);border:1px solid rgba(77,133,238,.2);transform:scale(.95);animation:popIn .2s ease-out forwards}
                .search-popup-close{margin-top:20px;width:100%;padding:10px 20px;cursor:pointer;background:rgba(28,31,37,.6);color:#e8ecf3;border:1px solid rgba(255,255,255,.12);border-radius:8px;font-size:14px;font-weight:600;transition:.2s}
                .search-popup-close:hover{background:rgba(28,31,37,.8);border-color:rgba(255,255,255,.2)}
                @keyframes fadeIn{from{opacity:0}to{opacity:1}}
                @keyframes popIn{to{transform:scale(1)}}
                @keyframes fadeOut{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.95)}}
                .fade-out{animation:fadeOut .2s ease-out forwards}
              `;
              document.head.appendChild(s);
            }

            isRunning = false;
          };

          const observer = new MutationObserver(() => {
            observer.disconnect();
            performCleanup();
            observer.observe(document.body, { childList: true, subtree: true });
          });

          performCleanup();
          observer.observe(document.body, { childList: true, subtree: true });
        }

        /*******************************************************
        name of function: createPopup
        description: Creates a popup with server filtering options and interactive buttons.
        *******************************************************/
        function createPopup() {
            const popup = document.createElement('div');
            popup.className = 'server-filters-dropdown-box';
            popup.style.cssText = `
        position: absolute;
        width: 210px;
        height: 382px;
        right: 0px;
        top: 30px;
        z-index: 1000;
        border-radius: 5px;
        background-color: rgb(30, 32, 34);
        display: flex;
        flex-direction: column;
        padding: 5px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        `;

            // header section
            const header = document.createElement('div');
            header.style.cssText = `
        display: flex;
        align-items: center;
        padding: 10px;
        border-bottom: 1px solid #444;
        margin-bottom: 5px;
        `;

            // add base64 logo
            const logo = document.createElement('img');
            logo.src = window.Base64Images.logo;
            logo.style.cssText = `
        width: 24px;
        height: 24px;
        margin-right: 10px;
        `;

            // add title
            const title = document.createElement('span');
            title.textContent = 'RoLocate';
            title.style.cssText = `
        color: white;
        font-size: 18px;
        font-weight: bold;
        `;

            // add logo and title
            header.appendChild(logo);
            header.appendChild(title);

            // add header
            popup.appendChild(header);

            // stuff for unique names, tooltips, experimental status, and explanations for each button
            const buttonData = [{
                    name: "Smallest Servers",
                    tooltip: "**Reverses the order of the server list.** The emptiest servers will be displayed first.",
                    experimental: false,
                    disabled: false,
                },
                {
                    name: "Available Space",
                    tooltip: "**Filters out servers which are full.** Servers with space will only be shown.",
                    experimental: false,
                    disabled: false,
                },
                {
                    name: "Player Count",
                    tooltip: "**Rolocate will find servers with your specified player count or fewer.** Searching for up to 3 minutes. If no exact match is found, it shows servers closest to the target.",
                    experimental: false,
                    disabled: false,
                },
                {
                    name: "Random Shuffle",
                    tooltip: "**Display servers in a completely random order.** Shows servers with space and servers with low player counts in a randomized order.",
                    experimental: false,
                    disabled: false,
                },
                {
                    name: "Server Region",
                    tooltip: "**Filters servers by region.** Offering more accuracy than 'Best Connection' in areas with fewer Roblox servers, like India, or in games with high player counts.",
                    experimental: true,
                    experimentalExplanation: "**Experimental**: Still in development and testing. Sometimes user location cannot be detected.",
                    disabled: false,
                },
                {
                    name: "Best Connection",
                    tooltip: "**Automatically joins the fastest servers for you.** However, it may be less accurate in regions with fewer Roblox servers, like India, or in games with large player counts.",
                    experimental: true,
                    experimentalExplanation: "**Experimental**: Still in development and testing.  it may be less accurate in regions with fewer Roblox servers",
                    disabled: false,
                },
                {
                    name: "Join Small Server",
                    tooltip: "**Automatically tries to join a server with a very low population.** On popular games servers may fill up very fast so you might not always get in alone.",
                    experimental: false,
                    disabled: false,
                },
                {
                    name: "Newest server",
                    tooltip: "**Tries to find Roblox servers that are less than 5 minute old.** This may take longer for very popular games or games with few players.",
                    disabledExplanation: "Does not work anymore.",
                    experimental: false,
                    disabled: true,
                },
            ];

            // create buttons with unique names, tooltips, experimental status, and explanations
            buttonData.forEach((data, index) => {
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'server-filter-option';
                buttonContainer.classList.add(data.disabled ? "disabled" : "enabled");

                // create a wrapper for the button content that can have opacity applied
                const buttonContentWrapper = document.createElement('div');
                buttonContentWrapper.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            ${data.disabled ? 'opacity: 0.7;' : ''}
        `;

                buttonContainer.style.cssText = `
            width: 190px;
            height: 30px;
            background-color: ${data.disabled ? '#2c2c2c' : '#393B3D'};
            margin: 5px;
            border-radius: 5px;
            padding: 3.5px;
            position: relative;
            cursor: ${data.disabled ? 'not-allowed' : 'pointer'};
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            transform: translateY(-30px);
            opacity: 0;
        `;

                // tooltip on the right side
                const tooltip = document.createElement('div');
                tooltip.className = 'filter-tooltip';
                tooltip.style.cssText = `
            display: none;
            position: absolute;
            top: -10px;
            left: 200px;
            width: auto;
            inline-size: 200px;
            height: auto;
            background-color: #191B1D;
            color: white;
            padding: 5px;
            border-radius: 5px;
            white-space: pre-wrap;
            font-size: 14px;
            opacity: 1;
            z-index: 1001;
        `;

                // parse tooltip text and replace **...** with bold HTML tags
                tooltip.innerHTML = data.tooltip.replace(/\*\*(.*?)\*\*/g, "<b style='color: #068f00;'>$1</b>");

                const buttonText = document.createElement('p');
                buttonText.style.cssText = `
            margin: 0;
            color: white;
            font-size: 16px;
        `;
                buttonText.textContent = data.name;

                // add "DISABLED" style if the button is disabled
                if (data.disabled) {
                    // show explanation tooltip (left side like experimental)
                    const disabledTooltip = document.createElement('div');
                    disabledTooltip.className = 'disabled-tooltip';
                    disabledTooltip.style.cssText = `
                        display: none;
                        position: absolute;
                        top: 0;
                        right: 200px;
                        width: 200px;
                        background-color: #191B1D;
                        color: white;
                        padding: 5px;
                        border-radius: 5px;
                        font-size: 14px;
                        white-space: pre-wrap;
                        z-index: 1001;
                        opacity: 1;
                    `;
                    disabledTooltip.innerHTML = data.disabledExplanation.replace(/\*\*(.*?)\*\*/g, '<span style="font-weight: bold; color: #ff5555;">$1</span>');

                    buttonContainer.appendChild(disabledTooltip);

                    // add disabled indicator
                    const disabledIndicator = document.createElement('span');
                    disabledIndicator.textContent = 'DISABLED';
                    disabledIndicator.style.cssText = `
                        margin-left: 8px;
                        color: #ff5555;
                        font-size: 10px;
                        font-weight: bold;
                        background-color: rgba(255, 85, 85, 0.1);
                        padding: 1px 4px;
                        border-radius: 3px;
                    `;
                    buttonText.appendChild(disabledIndicator);

                    // show on hover
                    buttonContainer.addEventListener('mouseenter', () => {
                        disabledTooltip.style.display = 'block';
                    });
                    buttonContainer.addEventListener('mouseleave', () => {
                        disabledTooltip.style.display = 'none';
                    });
                }

                // add "EXP" label if the button is experimental
                if (data.experimental) {
                    const expLabel = document.createElement('span');
                    expLabel.textContent = 'EXP';
                    expLabel.style.cssText = `
                margin-left: 8px;
                color: gold;
                font-size: 12px;
                font-weight: bold;
                background-color: rgba(255, 215, 0, 0.1);
                padding: 2px 6px;
                border-radius: 3px;
            `;
                    buttonText.appendChild(expLabel);

                    // add experimental explanation tooltip (left side)
                    const experimentalTooltip = document.createElement('div');
                    experimentalTooltip.className = 'experimental-tooltip';
                    experimentalTooltip.style.cssText = `
                      display: none;
                      position: absolute;
                      top: 0;
                      right: 200px;
                      width: 200px;
                      background-color: #191B1D;
                      color: white;
                      padding: 5px;
                      border-radius: 5px;
                      font-size: 14px;
                      white-space: pre-wrap;
                      z-index: 1001;
                      opacity: 1;
                  `;

                    // function to replace **text** with bold and gold styled text
                    const formatText = (text) => {
                        return text.replace(/\*\*(.*?)\*\*/g, '<span style="font-weight: bold; color: gold;">$1</span>');
                    };

                    // apply the formatting to the experimental explanation
                    experimentalTooltip.innerHTML = formatText(data.experimentalExplanation);

                    buttonContainer.appendChild(experimentalTooltip);

                    // show on hover
                    buttonContainer.addEventListener('mouseenter', () => {
                        experimentalTooltip.style.display = 'block';
                    });
                    buttonContainer.addEventListener('mouseleave', () => {
                        experimentalTooltip.style.display = 'none';
                    });
                }

                // appent main tooltip
                buttonContainer.appendChild(tooltip);

                // button text next top cointyainer
                buttonContentWrapper.appendChild(buttonText);

                // content wrapper to button contadiner
                buttonContainer.appendChild(buttonContentWrapper);

                // event listerners:
                buttonContainer.addEventListener('mouseover', () => {
                    tooltip.style.display = 'block';

                    if (data.experimental) {
                        const expTooltip = buttonContainer.querySelector('.experimental-tooltip');
                        if (expTooltip) expTooltip.style.display = 'block';
                    }
                    if (!data.disabled) {
                        buttonContainer.style.backgroundColor = '#4A4C4E';
                        buttonContainer.style.transform = 'translateY(0px) scale(1.02)';
                    }
                });

                buttonContainer.addEventListener('mouseout', () => {
                    tooltip.style.display = 'none';

                    if (data.experimental) {
                        const expTooltip = buttonContainer.querySelector('.experimental-tooltip');
                        if (expTooltip) expTooltip.style.display = 'none';
                    }
                    if (!data.disabled) {
                        buttonContainer.style.backgroundColor = '#393B3D';
                        buttonContainer.style.transform = 'translateY(0px) scale(1)';
                    }
                });

                buttonContainer.addEventListener('click', () => {
                    // no clciks on disabled buttons
                    if (data.disabled) {
                        return;
                    }

                    // add click animation
                    buttonContainer.style.transform = 'translateY(0px) scale(0.95)';
                    setTimeout(() => {
                        buttonContainer.style.transform = 'translateY(0px) scale(1)';
                    }, 150);

                    switch (index) {
                        case 0:
                            smallest_servers();
                            break;
                        case 1:
                            available_space_servers();
                            break;
                        case 2:
                            player_count_tab();
                            break;
                        case 3:
                            random_servers();
                            break;
                        case 4:
                            createServerCountPopup((totalLimit) => {
                                rebuildServerList(gameId, totalLimit);
                            });
                            break;
                        case 5:
                            rebuildServerList(gameId, 50, true); // finds 50 servers
                            notifications("Please Wait 5-7 seconds...", "info", "", "8000");
                            break;
                        case 6:
                            auto_join_small_server();
                            break;
                        case 7:
                            auto_join_small_server(); // for now
                            break;
                    }
                });

                popup.appendChild(buttonContainer);
            });

            // trigger the button animations after DOM insertion
            setTimeout(() => {
                const buttons = popup.querySelectorAll('.server-filter-option');
                buttons.forEach((button, index) => {
                    setTimeout(() => {
                        button.style.transform = 'translateY(0px)';
                        button.style.opacity = '1';
                    }, index * 30);
                });
            }, 20);

            return popup;
        }

        /*******************************************************
        name of function: ServerHop
        description: Handles server hopping by fetching and joining a random server, excluding recently joined servers.
        *******************************************************/
        function ServerHop() {
            ConsoleLogEnabled("Starting server hop...");

            showLoadingOverlay();
            // extract the game ID from the URL
            const url = window.location.href;
            const gameId = getCurrentGameId();

            ConsoleLogEnabled(`Game ID: ${gameId}`);

            // array to store server IDs
            let serverIds = [];
            let nextPageCursor = null;
            let pagesRequested = 0;

            // get the list of all recently joined servers in localStorage
            const allStoredServers = Object.keys(localStorage)
                .filter(key => key.startsWith("ROLOCATE_recentServers_")) // server go after!
                .map(key => JSON.parse(localStorage.getItem(key)));

                // remove any expired servers for all games (older than 15 minutes)
                const currentTime = new Date().getTime();
                allStoredServers.forEach((storedServers, index) => {
                    const key = Object.keys(localStorage).filter(k => k.startsWith("ROLOCATE_recentServers_"))[index];

                    const validServers = storedServers.filter(server => {
                        const lastJoinedTime = new Date(server.timestamp).getTime();
                        return (currentTime - lastJoinedTime) <= 15 * 60 * 1000; // 15 minutes
                    });

                    // update localStorage with the valid servers delete iof empytu
                    if (validServers.length > 0) {
                        localStorage.setItem(key, JSON.stringify(validServers));
                    } else {
                        localStorage.removeItem(key);
                        ConsoleLogEnabled(`Deleted empty key: ${key}`);
                    }
                });

            // get the list of recently joined servers for the current game
            const storedServers = JSON.parse(localStorage.getItem(`ROLOCATE_recentServers_${gameId}`)) || [];

            // check if there are any recently joined servers and exclude them from selection
            const validServers = storedServers.filter(server => {
                const lastJoinedTime = new Date(server.timestamp).getTime();
                return (currentTime - lastJoinedTime) <= 15 * 60 * 1000; // 15 minutes
            });

            if (validServers.length > 0) {
                ConsoleLogEnabled(`Excluding servers joined in the last 15 minutes: ${validServers.map(s => s.serverId).join(', ')}`);
            } else {
                ConsoleLogEnabled("No recently joined servers within the last 15 minutes. Proceeding to pick a new server.");
            }

            let currentDelay = 150; // Start with 0.15 seconds
            let isRateLimited = false;

            /*******************************************************
            name of function: fetchServers
            description: Function to fetch servers
            *******************************************************/
            function fetchServers(cursor) {
                // randomly choose between sortOrder=1 and sortOrder=2
                const sortOrder = Math.random() < 0.5 ? 1 : 2;
                const url = `https://games.roblox.com/v1/games/${gameId}/servers/0?sortOrder=${sortOrder}&excludeFullGames=true&limit=100${cursor ? `&cursor=${cursor}` : ""}`;

                ConsoleLogEnabled(`Using sortOrder: ${sortOrder}`);

                GM_xmlhttpRequest({
                    method: "GET",
                    url: url,
                    onload: function(response) {
                        ConsoleLogEnabled("API Response:", response.responseText);

                        if (response.status === 429) {
                            ConsoleLogEnabled("Rate limited! Slowing down requests.");
                            isRateLimited = true;
                            currentDelay = 750; // switch to 0.75 seconds
                            setTimeout(() => fetchServers(cursor), currentDelay);
                            return;
                        } else if (isRateLimited && response.status === 200) {
                            ConsoleLogEnabled("Recovered from rate limiting. Restoring normal delay.");
                            isRateLimited = false;
                            currentDelay = 150; // back to normal 0.15 seconds
                        }

                        try {
                            const data = JSON.parse(response.responseText);

                            if (data.errors) {
                                ConsoleLogEnabled("Skipping unreadable response:", data.errors[0].message);
                                return;
                            }

                            setTimeout(() => {
                                if (!data || !data.data) {
                                    ConsoleLogEnabled("Invalid response structure: 'data' is missing or undefined", data);
                                    return;
                                }

                                data.data.forEach(server => {
                                    if (validServers.some(vs => vs.serverId === server.id)) {
                                        ConsoleLogEnabled(`Skipping previously joined server ${server.id}.`);
                                    } else {
                                        serverIds.push(server.id);
                                    }
                                });

                                if (data.nextPageCursor && pagesRequested < 4) {
                                    pagesRequested++;
                                    ConsoleLogEnabled(`Fetching page ${pagesRequested}...`);
                                    fetchServers(data.nextPageCursor);
                                } else {
                                    pickRandomServer();
                                }
                            }, currentDelay);
                        } catch (error) {
                            ConsoleLogEnabled("Error parsing response:", error);
                        }
                    },
                    onerror: function(error) {
                        ConsoleLogEnabled("Error fetching server data:", error);
                    }
                });
            }

            /*******************************************************
            name of function: pickRandomServer
            description: Function to pick a random server and join it
            *******************************************************/
            async function pickRandomServer() {
                if (serverIds.length > 0) {
                    const serverRegionsPrefs = JSON.parse(localStorage.getItem('ROLOCATE_serverRegions') || '{}');
                    let attempts = 0;
                    while (attempts < 100 && serverIds.length > 0) { // 100 genrous attempts
                        const idx = Math.floor(Math.random() * serverIds.length);
                        const randomServerId = serverIds[idx];
                        ConsoleLogEnabled(`Considering server: ${randomServerId}`);
                        try {
                            const location = await fetchServerDetails(gameId, randomServerId);
                            const regionKey = `${location.city}_${location.country?.code}`;
                            if (serverRegionsPrefs[regionKey] === 'banned') {
                                ConsoleLogEnabled(`Skipping server ${randomServerId} due to banned region ${regionKey}.`);
                                notifications(`Skipping server ${randomServerId} due to banned region ${regionKey}.`, "info", "", "1000");
                                // remove this one so we don't pick it again
                                serverIds.splice(idx, 1);
                                attempts++;
                                continue;
                            }
                        } catch (e) {
                            ConsoleLogEnabled(`Error fetching details for server ${randomServerId} during ServerHop:`, e);
                            // remove and continue
                            serverIds.splice(idx, 1);
                            attempts++;
                            continue;
                        }

                        // join the game instance with the selected server ID
                        JoinServer(gameId, randomServerId);

                        // store the selected server ID with the time and date in localStorage
                        const timestamp = new Date().toISOString();
                        const newServer = {
                            serverId: randomServerId,
                            timestamp
                        };
                        validServers.push(newServer);

                        // save the updated list of recently joined servers to localStorage
                        localStorage.setItem(`ROLOCATE_recentServers_${gameId}`, JSON.stringify(validServers));

                        ConsoleLogEnabled(`Server ${randomServerId} stored with timestamp ${timestamp}`);
                        return;
                    }

                    ConsoleLogEnabled("No unbanned servers found to join. Try to enable more regions in settings!");
                    notifications("No unbanned servers found to join. Try to enable more regions in settings!", "error", "⚠️", "10000");
                } else {
                    ConsoleLogEnabled("No servers found to join.");
                    notifications("You have joined all the servers recently. No servers found to join.", "error", "⚠️", "5000");
                }
            }

            // start the fetching process
            fetchServers();
        }

        /*******************************************************
        name of function: Bulk of functions for observer stuff
        description: adds lots of stuff like autoserver regions and stuff
        *******************************************************/
        if (/^https:\/\/www\.roblox\.com(\/[a-z]{2})?\/games\//.test(window.location.href)) {
            if (localStorage.ROLOCATE_AutoRunServerRegions === "true") {
                (() => {
                    /*******************************************************
                    name of function: waitForElement
                    description: waits for a specific element to load onto
                    the page
                    *******************************************************/
                    function waitForElement(selector, timeout = 5000) {
                        return new Promise((resolve, reject) => {
                            const intervalTime = 100;
                            let elapsed = 0;
                            const interval = setInterval(() => {
                                const el = document.querySelector(selector);
                                if (el) {
                                    clearInterval(interval);
                                    resolve(el);
                                } else if (elapsed >= timeout) {
                                    clearInterval(interval);
                                    reject(new Error(`Element "${selector}" not found after ${timeout}ms`));
                                }
                                elapsed += intervalTime;
                            }, intervalTime);
                        });
                    }


                    /*******************************************************
                    name of function: waitForAnyElement
                    description: waits for any element on the page to load
                    *******************************************************/
                    function waitForAnyElement(selector, timeout = 5000) {
                        return new Promise((resolve, reject) => {
                            const intervalTime = 100;
                            let elapsed = 0;
                            const interval = setInterval(() => {
                                const elements = document.querySelectorAll(selector);
                                if (elements.length > 0) {
                                    clearInterval(interval);
                                    resolve(elements);
                                } else if (elapsed >= timeout) {
                                    clearInterval(interval);
                                    reject(new Error(`No elements matching "${selector}" found after ${timeout}ms`));
                                }
                                elapsed += intervalTime;
                            }, intervalTime);
                        });
                    }


                    /*******************************************************
                    name of function: waitForDivWithStyleSubstring
                    description: waits for server tab to show up, if this doesent
                    happen then it just spits out an error
                    *******************************************************/
                    function waitForDivWithStyleSubstring(substring, timeout = 5000) {
                        return new Promise((resolve, reject) => {
                            const intervalTime = 100;
                            let elapsed = 0;
                            const interval = setInterval(() => {
                                const divs = Array.from(document.querySelectorAll("div[style]"));
                                const found = divs.find(div => div.style && div.style.background && div.style.background.includes(substring));
                                if (found) {
                                    clearInterval(interval);
                                    resolve(found);
                                } else if (elapsed >= timeout) {
                                    clearInterval(interval);
                                    reject(new Error(`No div with style containing "${substring}" found after ${timeout}ms`));
                                }
                                elapsed += intervalTime;
                            }, intervalTime);
                        });
                    }

                    /*******************************************************
                    name of function: clickServersTab
                    description: clicks server tab on game page
                    *******************************************************/
                    async function clickServersTab() {
                        try {
                            const serversTab = await waitForElement("#tab-game-instances a");
                            serversTab.click();
                            ConsoleLogEnabled("[Auto] Servers tab clicked.");
                            return true;
                        } catch (err) {
                            ConsoleLogEnabled("[Auto] Servers tab not found:", err.message);
                            return false;
                        }
                    }

                    /*******************************************************
                    name of function: waitForServerListContainer
                    description: Waits for server list container to load onto the page
                    *******************************************************/
                    async function waitForServerListContainer() {
                        try {
                            const container = await waitForElement("#rbx-public-running-games");
                            ConsoleLogEnabled("[Auto] Server list container (#rbx-public-running-games) detected.");
                            return container;
                        } catch (err) {
                            ConsoleLogEnabled("[Auto] Server list container not found:", err.message);
                            return null;
                        }
                    }

                    /*******************************************************
                    name of function: waitForServerItems
                    description: Detects the server item for the functions to start
                    *******************************************************/
                    async function waitForServerItems() {
                        try {
                            const items = await waitForAnyElement(".rbx-public-game-server-item");
                            ConsoleLogEnabled(`[Auto] Detected ${items.length} server item(s) (.rbx-public-game-server-item)`);
                            return items;
                        } catch (err) {
                            ConsoleLogEnabled("[Auto] Server items not found:", err.message);
                            return null;
                        }
                    }

                    /*******************************************************
                    name of function: runServerRegions
                    description: Runs auto server regions
                    *******************************************************/

                    async function runServerRegions() {
                        // store the original state at the beginning using getItem/setItem
                        // i did some magic here now i don't know why this disabled notificatioons
                        const originalNotifFlag = window.localStorage.getItem('ROLOCATE_enablenotifications');

                        ConsoleLogEnabled("[DEBUG] Original state:", originalNotifFlag);

                        if (originalNotifFlag === "true") {
                            window.localStorage.setItem('ROLOCATE_enablenotifications', 'false');
                            ConsoleLogEnabled("[Auto] Notifications disabled.");
                        } else {
                            ConsoleLogEnabled("[Auto] Notifications already disabled; leaving flag untouched.");
                        }

                        const gameId = getCurrentGameId();
                        if (!gameId) {
                            ConsoleLogEnabled("[Auto] Game ID not found, aborting runServerRegions.");
                            // restore original state before early return
                            if (originalNotifFlag !== null) {
                                window.localStorage.setItem('ROLOCATE_enablenotifications', originalNotifFlag);
                            }
                            ConsoleLogEnabled("[DEBUG] Restored to:", window.localStorage.getItem('ROLOCATE_enablenotifications'));
                            ConsoleLogEnabled("[Auto] Notifications restored to original state (early abort).");
                            return;
                        }

                        if (typeof Loadingbar === "function") Loadingbar(true);
                        if (typeof disableFilterButton === "function") disableFilterButton(true);
                        if (typeof disableLoadMoreButton === "function") disableLoadMoreButton();
                        if (typeof rebuildServerList === "function") {
                            const serverCount = parseInt(window.localStorage.getItem('ROLOCATE_AutoRunServerRegionsnumber')) || 16; // fallback to 16
                            rebuildServerList(gameId, serverCount);
                            ConsoleLogEnabled(`[Auto] Server list rebuilt for game ID: ${gameId}`);
                        } else {
                            ConsoleLogEnabled("[Auto] rebuildServerList function not found.");
                        }

                        if (originalNotifFlag === "true") {
                            try {
                                await waitForDivWithStyleSubstring(
                                    "radial-gradient(circle, rgba(255, 40, 40, 0.4)",
                                    5000
                                );
                                // restore original state
                                window.localStorage.setItem('ROLOCATE_enablenotifications', originalNotifFlag);
                                ConsoleLogEnabled("[DEBUG] Restored to:", window.localStorage.getItem('ROLOCATE_enablenotifications'));
                                ConsoleLogEnabled("[Auto] Notifications restored to original state (style div detected).");
                            } catch (err) {
                                ConsoleLogEnabled("[Auto] Style div not detected in time:", err.message);
                                // restore original state even if there's an error
                                window.localStorage.setItem('ROLOCATE_enablenotifications', originalNotifFlag);
                                ConsoleLogEnabled("[DEBUG] Restored to:", window.localStorage.getItem('ROLOCATE_enablenotifications'));
                                ConsoleLogEnabled("[Auto] Notifications restored to original state (error occurred).");
                            }
                        }

                        // final restoration to ensure it's always restored
                        if (originalNotifFlag !== null) {
                            window.localStorage.setItem('ROLOCATE_enablenotifications', originalNotifFlag);
                        }
                        ConsoleLogEnabled("[DEBUG] Final restore to:", window.localStorage.getItem('ROLOCATE_enablenotifications'));
                        ConsoleLogEnabled("[Auto] Function completed - notifications restored to original state.");
                    }

                    window.addEventListener("load", async () => {
                        const clicked = await clickServersTab();
                        if (!clicked) return;

                        const container = await waitForServerListContainer();
                        if (!container) return;

                        const items = await waitForServerItems();
                        if (!items) return;

                        await runServerRegions();
                    });
                })();
            } else {
                ConsoleLogEnabled("[Auto] ROLOCATE_AutoRunServerRegions is not true. Script skipped.");
            }

            /*******************************************************
            name of function: An observer
            description: Not a function, but an observer which adds the
            filter button, server hop button, recent servers, disables
            trailer autoplay, and adds monitor server button if settings are true
            *******************************************************/
            let bettergamesstats_action_enabled = false;
            let trailerDisableInitialized = false; // for the dumb trailer thing
            const observer = new MutationObserver((mutations, obs) => {
                const serverListOptions = document.querySelector('.server-list-options');
                const playButton = document.querySelector('.btn-common-play-game-lg.btn-primary-md');
                if (serverListOptions && !document.querySelector('.RL-filter-button') && localStorage.getItem("ROLOCATE_togglefilterserversbutton") === "true") {

                    ConsoleLogEnabled("Added Filter Button");
                    const filterButton = document.createElement('a'); // yes lmao
                    filterButton.className = 'RL-filter-button';
                    filterButton.style.cssText = `
                    color: ${isDarkMode(true) ? 'white' : 'black'};
                    font-weight: bold;
                    text-decoration: none;
                    cursor: pointer;
                    margin-left: 10px;
                    padding: 5px 10px;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    position: relative;
                    margin-top: 4px;
                    `;

                    filterButton.addEventListener('mouseover', () => {
                        filterButton.style.textDecoration = 'underline';
                    });
                    filterButton.addEventListener('mouseout', () => {
                        filterButton.style.textDecoration = 'none';
                    });

                    const buttonText = document.createElement('span');
                    buttonText.className = 'RL-filter-text';
                    buttonText.textContent = 'Filters';
                    filterButton.appendChild(buttonText);

                    const icon = document.createElement('span');
                    icon.className = 'RL-filter-icon';
                    icon.textContent = '≡';
                    icon.style.cssText = `font-size: 18px;`;
                    filterButton.appendChild(icon);

                    serverListOptions.appendChild(filterButton);

                    let popup = null;
                    filterButton.addEventListener('click', (event) => {
                        event.stopPropagation();
                        if (popup) {
                            popup.remove();
                            popup = null;
                        } else {
                            popup = createPopup();
                            popup.style.top = `${filterButton.offsetHeight}px`;
                            popup.style.left = '0';
                            filterButton.appendChild(popup);
                        }
                    });

                    document.addEventListener('click', (event) => {
                        if (popup && !filterButton.contains(event.target)) {
                            popup.remove();
                            popup = null;
                        }
                    });
                }
                // new condition to trigger recent server logic
                if (localStorage.getItem("ROLOCATE_togglerecentserverbutton") === "true" && !document.querySelector('.recent-servers-section')) {
                    HandleRecentServers();
                }

                // new condition to trigger recent server logic
                if (localStorage.getItem("ROLOCATE_bettergamestats") === "true" && !bettergamesstats_action_enabled) {
                    bettergamestats_action();
                    bettergamesstats_action_enabled = true;
                }

                // new condition to trigger disable trailer logic
                if (localStorage.getItem("ROLOCATE_disabletrailer") === "true" && !trailerDisableInitialized) {
                    disableVideoAutoplay();
                    trailerDisableInitialized = true;
                }

                // new condition to trigger compact private server logic
                if (localStorage.getItem("ROLOCATE_betterprivateservers") === "true" && !document.querySelector('.rolocate-view-players-btn')) {
                    cleanupPrivateServerCards();
                }

                if (playButton && !document.querySelector('.rolocate-serverhop-custom-play-button') && localStorage.getItem("ROLOCATE_toggleserverhopbutton") === "true") {
                    ConsoleLogEnabled("Added Server Hop Button");
                    const buttonContainer = document.createElement('div');
                    buttonContainer.style.cssText = `
                display: flex;
                gap: 10px;
                align-items: center;
                width: 100%;
            `;

                    playButton.style.cssText += `
                flex: 3;
                padding: 10px 12px;
                text-align: center;
            `;

                    const serverHopButton = document.createElement('button');
                    serverHopButton.className = 'rolocate-serverhop-custom-play-button';
                    serverHopButton.style.cssText = `
                background-color: #335fff;
                color: white;
                border: none;
                padding: 7.5px 12px;
                cursor: pointer;
                font-weight: bold;
                border-radius: 8px;
                flex: 1;
                text-align: center;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            `;

                    const tooltip = document.createElement('div');
                    tooltip.textContent = 'Join Random Server / Server Hop';
                    tooltip.style.cssText = `
                        position: absolute;
                        background: rgba(51, 95, 255, 0.9);
                        color: white;
                        padding: 6px 10px;
                        border-radius: 8px;
                        font-size: 12px;
                        font-weight: 500;
                        letter-spacing: 0.025em;
                        visibility: hidden;
                        opacity: 0;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        bottom: calc(100% + 8px);
                        left: 50%;
                        transform: translateX(-50%) translateY(4px);
                        white-space: nowrap;
                        box-shadow:
                            0 20px 25px -5px rgba(0, 0, 0, 0.1),
                            0 10px 10px -5px rgba(0, 0, 0, 0.04),
                            0 0 0 1px rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(148, 163, 184, 0.1);
                        z-index: 1000;

                        /* Arrow */
                        &::after {
                            content: '';
                            position: absolute;
                            top: 100%;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 0;
                            height: 0;
                            border-left: 5px solid transparent;
                            border-right: 5px solid transparent;
                            border-top: 5px solid rgba(51, 95, 255, 0.9);
                            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
                        }
                    `;
                    serverHopButton.appendChild(tooltip);

                    serverHopButton.addEventListener('mouseover', () => {
                        tooltip.style.visibility = 'visible';
                        tooltip.style.opacity = '1';
                    });

                    serverHopButton.addEventListener('mouseout', () => {
                        tooltip.style.visibility = 'hidden';
                        tooltip.style.opacity = '0';
                    });

                    const logo = document.createElement('img');
                    logo.src = window.Base64Images.icon_serverhop;
                    logo.style.cssText = `
                width: 45px;
                height: 45px;
            `;
                    serverHopButton.appendChild(logo);

                    playButton.parentNode.insertBefore(buttonContainer, playButton);
                    buttonContainer.appendChild(playButton);
                    buttonContainer.appendChild(serverHopButton);

                    serverHopButton.addEventListener('click', () => {
                        ServerHop();
                    });
                }

                // for the like join confimatrion
                if (playButton && localStorage.getItem("ROLOCATE_joinconfirmation") === "true") {
                  monitorPlayButton();
                }

                const filterEnabled = localStorage.getItem("ROLOCATE_togglefilterserversbutton") === "true";
                const hopEnabled = localStorage.getItem("ROLOCATE_toggleserverhopbutton") === "true";
                const recentEnabled = localStorage.getItem("ROLOCATE_togglerecentserverbutton") === "true";

                const filterPresent = !filterEnabled || document.querySelector('.RL-filter-button');
                const hopPresent = !hopEnabled || document.querySelector('.rolocate-serverhop-custom-play-button');
                const recentPresent = !recentEnabled || document.querySelector('.recent-servers-section');

                if (filterPresent && hopPresent && recentPresent) {
                    obs.disconnect();
                    ConsoleLogEnabled("Disconnected Observer");
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }




        /*********************************************************************************************************************************************************************************************************************************************
                                                                 The End of: This is all of the functions for the filter button and the popup for the 8 buttons does not include the functions for the 8 buttons

        *********************************************************************************************************************************************************************************************************************************************/

        // Quick join handler for smartsearch
        if (window.location.hash === '#?ROLOCATE_QUICKJOIN') {
            if (localStorage.ROLOCATE_smartsearch === 'true' || localStorage.ROLOCATE_quicklaunchgames === 'true') { // fixed this

                const gameId = getCurrentGameId();

                if (!gameId) {
                    ConsoleLogEnabled('Could not extract gameId from URL');
                    notifications('Error: Failed to extract gameid. Please try again later.', 'error', '⚠️', 5000);
                    return;
                }

                rebuildServerList(gameId, 50, false, true);


                // clean up the URL
                history.replaceState(null, null, window.location.pathname + window.location.search);
            } else {
                ConsoleLogEnabled('[RoLocate] Quick Join detected but smartsearch is disabled');
            }
        }



        /*********************************************************************************************************************************************************************************************************************************************
                                                                 Functions for the 1st button

        *********************************************************************************************************************************************************************************************************************************************/


        /*******************************************************
        name of function: smallest_servers
        description: Fetches the smallest servers, disables the "Load More" button, shows a loading bar, and recreates the server cards.
        *******************************************************/
        async function smallest_servers() {
            // disable the "Load More" button and show the loading bar
            Loadingbar(true);
            disableFilterButton(true);
            disableLoadMoreButton();
            notifications("Finding small servers...", "success", "🧐");

            // get the game ID from the URL
            const gameId = getCurrentGameId();

            // retry thing
            let retries = 3;
            let success = false;

            while (retries > 0 && !success) {
                try {
                    // get server data
                    const response = await new Promise((resolve, reject) => {
                        GM_xmlhttpRequest({
                            method: "GET",
                            url: `https://games.roblox.com/v1/games/${gameId}/servers/0?sortOrder=1&excludeFullGames=true&limit=25`,
                            onload: function(response) {
                                if (response.status === 429) {
                                    reject(new Error('429: Too Many Requests'));
                                } else if (response.status >= 200 && response.status < 300) {
                                    resolve(response);
                                } else {
                                    reject(new Error(`HTTP error! status: ${response.status}`));
                                }
                            },
                            onerror: function(error) {
                                reject(error);
                            }
                        });
                    });

                    const data = JSON.parse(response.responseText);

                    // find info on each server
                    for (const server of data.data) {
                        const {
                            id: serverId,
                            playerTokens,
                            maxPlayers,
                            playing
                        } = server;

                        // give to rbx_card function
                        await rbx_card(serverId, playerTokens, maxPlayers, playing, gameId);
                    }

                    success = true; // mark as successful if no errors occurred
                } catch (error) {
                    retries--; // remove 1

                    if (error.message === '429: Too Many Requests' && retries > 0) {
                        ConsoleLogEnabled('Encountered a 429 error. Retrying in 5 seconds...');
                        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds
                    } else {
                        ConsoleLogEnabled('Error fetching server data:', error);
                        notifications('Error: Failed to fetch server data. Please try again later.', 'error', '⚠️', '5000');
                        Loadingbar(false);
                        break; // exit the loop if it's not a 429 error or no retries left
                    }
                } finally {
                    if (success || retries === 0) {
                        // hide the loading bar and enable the filter button
                        Loadingbar(false);
                        disableFilterButton(false);
                    }
                }
            }
        }



        /*********************************************************************************************************************************************************************************************************************************************
                                                                 Functions for the 2nd button

        *********************************************************************************************************************************************************************************************************************************************/


        /*******************************************************
        name of function: available_space_servers
        description: Fetches servers with available space, disables the "Load More" button, shows a loading bar, and recreates the server cards.
        *******************************************************/
        async function available_space_servers() {
            // disable the "Load More" button and show the loading bar
            Loadingbar(true);
            disableLoadMoreButton();
            disableFilterButton(true);
            notifications("Finding servers with space...", "success", "🧐");

            // get the game ID from the URL
            const gameId = getCurrentGameId();

            // retry thing
            let retries = 3;
            let success = false;

            while (retries > 0 && !success) {
                try {
                    // get server data
                    const response = await new Promise((resolve, reject) => {
                        GM_xmlhttpRequest({
                            method: "GET",
                            url: `https://games.roblox.com/v1/games/${gameId}/servers/0?sortOrder=2&excludeFullGames=true&limit=25`,
                            onload: function(response) {
                                if (response.status === 429) {
                                    reject(new Error('429: Too Many Requests'));
                                } else if (response.status >= 200 && response.status < 300) {
                                    resolve(response);
                                } else {
                                    reject(new Error(`HTTP error! status: ${response.status}`));
                                }
                            },
                            onerror: function(error) {
                                reject(error);
                            }
                        });
                    });

                    const data = JSON.parse(response.responseText);

                    // get server info
                    for (const server of data.data) {
                        const {
                            id: serverId,
                            playerTokens,
                            maxPlayers,
                            playing
                        } = server;

                        // give to function for card creation
                        await rbx_card(serverId, playerTokens, maxPlayers, playing, gameId);
                    }

                    success = true; // mark successful if no errors
                } catch (error) {
                    retries--; // remove 1

                    if (error.message === '429: Too Many Requests' && retries > 0) {
                        ConsoleLogEnabled('Encountered a 429 error. Retrying in 10 seconds...');
                        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for 10 seconds
                    } else {
                        ConsoleLogEnabled('Error fetching server data:', error);
                        break; // exit the loop if it's not a 429 error or no retries left
                    }
                } finally {
                    if (success || retries === 0) {
                        // hide the loading bar and enable the filter button
                        Loadingbar(false);
                        disableFilterButton(false);
                    }
                }
            }
        }

        /*********************************************************************************************************************************************************************************************************************************************
                                                                 Functions for the 3rd button

        *********************************************************************************************************************************************************************************************************************************************/


        /*******************************************************
        	name of function: player_count_tab
        	description: Opens a popup for the user to select the max player count using a slider and filters servers accordingly. Maybe one of my best functions lowkey.
        *******************************************************/
        function player_count_tab() {
            // check if the max player count has already been determined
            if (!player_count_tab.maxPlayers) {
                // try to find the element containing the player count information
                const playerCountElement = document.querySelector('.text-info.rbx-game-status.rbx-game-server-status.text-overflow');
                if (playerCountElement) {
                    const playerCountText = playerCountElement.textContent.trim();
                    const match = playerCountText.match(/(\d+) of (\d+) people max/);
                    if (match) {
                        const maxPlayers = parseInt(match[2], 10);
                        if (!isNaN(maxPlayers) && maxPlayers > 1) {
                            player_count_tab.maxPlayers = maxPlayers;
                            ConsoleLogEnabled("Found text element with max playercount");
                        }
                    }
                } else {
                    // if the element is not found, extract the gameId from the URL
                    const gameId = getCurrentGameId();
                    if (/^\d{1,10}$/.test(gameId)) { // check if numeric
                        // send a request to the Roblox API to get server information
                        GM_xmlhttpRequest({
                            method: 'GET',
                            url: `https://games.roblox.com/v1/games/${gameId}/servers/public?sortOrder=1&excludeFullGames=true&limit=100`,
                            onload: function(response) {
                                try {
                                    if (response.status === 429) {
                                        // Rate limit error, default to 100
                                        ConsoleLogEnabled("Rate limited defaulting to 100.");
                                        player_count_tab.maxPlayers = 100;
                                    } else {
                                        ConsoleLogEnabled("Valid api response");
                                        const data = JSON.parse(response.responseText);
                                        if (data.data && data.data.length > 0) {
                                            const maxPlayers = data.data[0].maxPlayers;
                                            if (!isNaN(maxPlayers) && maxPlayers > 1) {
                                                player_count_tab.maxPlayers = maxPlayers;
                                            }
                                        }
                                    }
                                    // update the slider range if the popup is already created
                                    const slider = document.querySelector('.player-count-popup input[type="range"]');
                                    if (slider) {
                                        slider.max = player_count_tab.maxPlayers ? (player_count_tab.maxPlayers - 1).toString() : '100';
                                        slider.style.background = `
                        linear-gradient(
                            to right,
                            #00A2FF 0%,
                            #00A2FF ${slider.value}%,
                            #444 ${slider.value}%,
                            #444 100%
                        );
                    `;
                                    }
                                } catch (error) {
                                    ConsoleLogEnabled('Failed to parse API response:', error);
                                    // default to 100 if parsing fails
                                    player_count_tab.maxPlayers = 100;
                                    const slider = document.querySelector('.player-count-popup input[type="range"]');
                                    if (slider) {
                                        slider.max = '100';
                                        slider.style.background = `
                        linear-gradient(
                            to right,
                            #00A2FF 0%,
                            #00A2FF ${slider.value}%,
                            #444 ${slider.value}%,
                            #444 100%
                        );
                    `;
                                    }
                                }
                            },
                            onerror: function(error) {
                                ConsoleLogEnabled('Failed to fetch server information:', error);
                                ConsoleLogEnabled('Fallback to 100 players.');
                                // default to 100 if the request fails
                                player_count_tab.maxPlayers = 100;
                                const slider = document.querySelector('.player-count-popup input[type="range"]');
                                if (slider) {
                                    slider.max = '100';
                                    slider.style.background = `
                    linear-gradient(
                        to right,
                        #00A2FF 0%,
                        #00A2FF ${slider.value}%,
                        #444 ${slider.value}%,
                        #444 100%
                    );
                `;
                                }
                            }
                        });
                    }
                }
            }
            // create the overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
            document.body.appendChild(overlay);

            // create the popup container
            const popup = document.createElement('div');
            popup.className = 'player-count-popup';
            popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgb(30, 32, 34);
        padding: 20px;
        border-radius: 10px;
        z-index: 10000;
        box-shadow: 0 0 15px rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
        width: 300px;
        opacity: 0;
        transition: opacity 0.3s ease, transform 0.3s ease;
    `;

            // add a close button in the top-right corner (bigger size)
            const closeButton = document.createElement('button');
            closeButton.innerHTML = '&times;'; // using '×' for the close icon
            closeButton.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: transparent;
        border: none;
        color: #ffffff;
        font-size: 24px; /* Increased font size */
        cursor: pointer;
        width: 36px; /* Increased size */
        height: 36px; /* Increased size */
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.3s ease, color 0.3s ease;
    `;
            closeButton.addEventListener('mouseenter', () => {
                closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                closeButton.style.color = '#ff4444';
            });
            closeButton.addEventListener('mouseleave', () => {
                closeButton.style.backgroundColor = 'transparent';
                closeButton.style.color = '#ffffff';
            });

            // add a title
            const title = document.createElement('h3');
            title.textContent = 'Select Max Player Count';
            title.style.cssText = `
        color: white;
        margin: 0;
        font-size: 18px;
        font-weight: 500;
    `;
            popup.appendChild(title);

            // add a slider with improved functionality and styling
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = '1';
            slider.max = player_count_tab.maxPlayers ? (player_count_tab.maxPlayers - 1).toString() : '100';
            slider.value = '1'; // Default value
            slider.step = '1'; // Step for better accuracy
            slider.style.cssText = `
        width: 80%;
        cursor: pointer;
        margin: 10px 0;
        -webkit-appearance: none; /* Remove default styling */
        background: transparent;
    `;
            // Custom slider track
            slider.style.background = `
        linear-gradient(
            to right,
            #00A2FF 0%,
            #00A2FF ${slider.value}%,
            #444 ${slider.value}%,
            #444 100%
        );
        border-radius: 5px;
        height: 6px;
    `;
            // custom slider thumb
            slider.style.setProperty('--thumb-size', '20px'); /* Larger thumb */
            slider.style.setProperty('--thumb-color', '#00A2FF');
            slider.style.setProperty('--thumb-hover-color', '#0088cc');
            slider.style.setProperty('--thumb-border', '2px solid #fff');
            slider.style.setProperty('--thumb-shadow', '0 0 5px rgba(0, 0, 0, 0.5)');
            slider.addEventListener('input', () => {
                slider.style.background = `
            linear-gradient(
                to right,
                #00A2FF 0%,
                #00A2FF ${slider.value}%,
                #444 ${slider.value}%,
                #444 100%
            );
        `;
                sliderValue.textContent = slider.value; // update the displayed value
            });
            // keyboard support for better accuracy (fixed to increment/decrement by 1)
            slider.addEventListener('keydown', (arrowkeybutton) => {
                arrowkeybutton.preventDefault(); // orevent default behavior (which might cause jumps)
                let newValue = parseInt(slider.value, 10);
                if (arrowkeybutton.key === 'ArrowLeft' || arrowkeybutton.key === 'ArrowDown') {
                    newValue = Math.max(1, newValue - 1); // decrease by 1
                } else if (arrowkeybutton.key === 'ArrowRight' || arrowkeybutton.key === 'ArrowUp') {
                    newValue = Math.min(100, newValue + 1); // increase by 1
                }
                slider.value = newValue;
                slider.dispatchEvent(new Event('input'));
            });
            popup.appendChild(slider);

            // add a display for the slider value
            const sliderValue = document.createElement('span');
            sliderValue.textContent = slider.value;
            sliderValue.style.cssText = `
        color: white;
        font-size: 16px;
        font-weight: bold;
    `;
            popup.appendChild(sliderValue);

            // add a submit button with dark, blackish style
            const submitButton = document.createElement('button');
            submitButton.textContent = 'Search';
            submitButton.style.cssText = `
        padding: 8px 20px;
        font-size: 16px;
        background-color: #1a1a1a; /* Dark blackish color */
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.3s ease, transform 0.2s ease;
    `;
            submitButton.addEventListener('mouseenter', () => {
                submitButton.style.backgroundColor = '#333';
                submitButton.style.transform = 'scale(1.05)';
            });
            submitButton.addEventListener('mouseleave', () => {
                submitButton.style.backgroundColor = '#1a1a1a';
                submitButton.style.transform = 'scale(1)';
            });

            // add yeelow stuff
            const tipBox = document.createElement('div');
            tipBox.style.cssText = `
        width: 100%;
        padding: 10px;
        background-color: rgba(255, 204, 0, 0.15);
        border-radius: 5px;
        text-align: center;
        font-size: 14px;
        color: #ffcc00;
        transition: background-color 0.3s ease;
    `;
            tipBox.textContent = 'Tip: Click the slider and use the arrow keys for more accuracy.';
            tipBox.addEventListener('mouseenter', () => {
                tipBox.style.backgroundColor = 'rgba(255, 204, 0, 0.25)';
            });
            tipBox.addEventListener('mouseleave', () => {
                tipBox.style.backgroundColor = 'rgba(255, 204, 0, 0.15)';
            });
            popup.appendChild(tipBox);

            // append the popup to the body
            document.body.appendChild(popup);

            // fade in the overlay and popup
            setTimeout(() => {
                overlay.style.opacity = '1';
                popup.style.opacity = '1';
                popup.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 10);

            /*******************************************************
                name of function: fadeOutAndRemove
                description: Fades out and removes the popup and overlay.
            *******************************************************/
            function fadeOutAndRemove(popup, overlay) {
                popup.style.opacity = '0';
                popup.style.transform = 'translate(-50%, -50%) scale(0.9)';
                overlay.style.opacity = '0';
                setTimeout(() => {
                    popup.remove();
                    overlay.remove();
                }, 300); // match the duration of the transition
            }

            // close the popup when the close button is clicked
            closeButton.addEventListener('click', () => {
                fadeOutAndRemove(popup, overlay);
            });

            // handle submit button click
            submitButton.addEventListener('click', () => {
                const maxPlayers = parseInt(slider.value, 10);
                if (!isNaN(maxPlayers) && maxPlayers > 0) {
                    filterServersByPlayerCount(maxPlayers);
                    fadeOutAndRemove(popup, overlay);
                } else {
                    notifications('Error: Please enter a number greater than 0', 'error', '⚠️', '5000');
                }
            });

            popup.appendChild(submitButton);
            popup.appendChild(closeButton);
        }


        /*******************************************************
        name of function: fetchServersWithRetry
        description: Fetches server data with retry logic and a delay between requests to avoid rate-limiting.
        Uses GM_xmlhttpRequest instead of fetch.
        *******************************************************/
        async function fetchServersWithRetry(url, retries = 15, currentDelay = 750) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    onload: function(response) {
                        // check for 429 rate limit
                        if (response.status === 429) {
                            if (retries > 0) {
                                const newDelay = currentDelay * 1; // Exponential backoff
                                ConsoleLogEnabled(`[DEBUG] Rate limited. Waiting ${newDelay / 1000} seconds before retrying...`);
                                setTimeout(() => {
                                    resolve(fetchServersWithRetry(url, retries - 1, newDelay)); // Retry with increased delay
                                }, newDelay);
                            } else {
                                ConsoleLogEnabled('[DEBUG] Rate limit retries exhausted.');
                                notifications('Error: Rate limited please try again later.', 'error', '⚠️', '5000');
                                reject(new Error('RateLimit'));
                            }
                            return;
                        }

                        // random errors handle it
                        if (response.status < 200 || response.status >= 300) {
                            ConsoleLogEnabled('[DEBUG] HTTP error:', response.status, response.statusText);
                            reject(new Error(`HTTP error: ${response.status}`));
                            return;
                        }

                        // give json data af5ter parsing
                        try {
                            const data = JSON.parse(response.responseText);
                            ConsoleLogEnabled('[DEBUG] Fetched data successfully:', data);
                            resolve(data);
                        } catch (error) {
                            ConsoleLogEnabled('[DEBUG] Error parsing JSON:', error);
                            reject(error);
                        }
                    },
                    onerror: function(error) {
                        ConsoleLogEnabled('[DEBUG] Error in GM_xmlhttpRequest:', error);
                        reject(error);
                    }
                });
            });
        }

        /*******************************************************
        name of function: filterServersByPlayerCount
        description: Filters servers to show only those with a player count equal to or below the specified max.
        If no exact matches are found, prioritizes servers with player counts lower than the input.
        Keeps fetching until at least 8 servers are found, with a dynamic delay between requests.
        *******************************************************/
        async function filterServersByPlayerCount(maxPlayers) {
            // make sure it actually good
            if (isNaN(maxPlayers) || maxPlayers < 1 || !Number.isInteger(maxPlayers)) {
                ConsoleLogEnabled('[DEBUG] Invalid input for maxPlayers.');
                notifications('Error: Please input a valid whole number greater than or equal to 1.', 'error', '⚠️', '5000');
                return;
            }

            // disable UI elements and clear the server list
            Loadingbar(true);
            disableLoadMoreButton();
            disableFilterButton(true);
            document.querySelector('#rbx-public-game-server-item-container').innerHTML = '';

            const gameId = getCurrentGameId();

            let cursor = null,
                serversFound = 0,
                serverMaxPlayers = null,
                isCloserToOne = null;
            let topDownServers = [],
                bottomUpServers = []; // servers collected during searches
            let currentDelay = 500; // initial delay of 0.5 seconds
            const timeLimit = 3 * 60 * 1000,
                startTime = Date.now(); // 3 minutes limit
            notifications('Will search for a maximum of 3 minutes to find a server.', 'success', '🔎', '5000');

            try {
                while (serversFound < 16) {
                    // check if the time limit has been exceeded
                    if (Date.now() - startTime > timeLimit) {
                        ConsoleLogEnabled('[DEBUG] Time limit reached. Proceeding to fallback servers.');
                        notifications('Warning: Time limit reached. Proceeding to fallback servers.', 'warning', '❗', '5000');
                        break;
                    }

                    // fetch initial data to determine serverMaxPlayers and isCloserToOne
                    if (!serverMaxPlayers) {
                        const initialUrl = cursor ?
                            `https://games.roblox.com/v1/games/${gameId}/servers/public?excludeFullGames=true&limit=100&cursor=${cursor}` :
                            `https://games.roblox.com/v1/games/${gameId}/servers/public?excludeFullGames=true&limit=100`;

                        const initialData = await fetchServersWithRetry(initialUrl);
                        if (initialData.data.length > 0) {
                            serverMaxPlayers = initialData.data[0].maxPlayers;
                            isCloserToOne = maxPlayers <= (serverMaxPlayers / 2);
                        } else {
                            notifications("No servers found in initial fetch.", "error", "⚠️", "5000");
                            ConsoleLogEnabled('[DEBUG] No servers found in initial fetch.', 'warning', '❗');
                            break;
                        }
                    }

                    // vaklidate maxplayers
                    if (maxPlayers >= serverMaxPlayers) {
                        ConsoleLogEnabled('[DEBUG] Invalid input: maxPlayers is greater than or equal to serverMaxPlayers.');
                        notifications(`Error: Please input a number between 1 through ${serverMaxPlayers - 1}`, 'error', '⚠️', '5000');
                        return;
                    }

                    // adjust the URL based on isCloserToOne
                    const baseUrl = isCloserToOne ?
                        `https://games.roblox.com/v1/games/${gameId}/servers/public?sortOrder=1&excludeFullGames=true&limit=100` :
                        `https://games.roblox.com/v1/games/${gameId}/servers/public?excludeFullGames=true&limit=100`;

                    const url = cursor ? `${baseUrl}&cursor=${cursor}` : baseUrl;
                    const data = await fetchServersWithRetry(url);

                    // servber lsit good?
                    if (!Array.isArray(data.data)) {
                        ConsoleLogEnabled('[DEBUG] Invalid server list received. Waiting 1 second before retrying...');
                        await delay(1000);
                        continue;
                    }

                    // filter sevrers
                    for (const server of data.data) {
                        if (server.playing === maxPlayers) {
                            await rbx_card(server.id, server.playerTokens, server.maxPlayers, server.playing, gameId);
                            serversFound++;
                            if (serversFound >= 16) break;
                        } else if (!isCloserToOne && server.playing > maxPlayers) {
                            topDownServers.push(server);
                        } else if (isCloserToOne && server.playing < maxPlayers) {
                            bottomUpServers.push(server);
                        }
                    }

                    if (!data.nextPageCursor) break;
                    cursor = data.nextPageCursor;

                    // dynamicaic delay
                    if (currentDelay > 150) {
                        currentDelay = Math.max(150, currentDelay / 2);
                    }
                    ConsoleLogEnabled(`[DEBUG] Waiting ${currentDelay / 1000} seconds before next request...`);
                    await delay(currentDelay);
                }

                // if no exact matches were found or time limit reached, use fallback servers
                if (serversFound === 0 && (topDownServers.length > 0 || bottomUpServers.length > 0)) {
                    notifications(`There are no servers with ${maxPlayers} players. Showing servers closest to ${maxPlayers} players.`, 'warning', '😔', '8000');

                    topDownServers.sort((a, b) => a.playing - b.playing);
                    bottomUpServers.sort((a, b) => b.playing - a.playing);
                    const combinedFallback = [...topDownServers, ...bottomUpServers];

                    for (const server of combinedFallback) {
                        await rbx_card(server.id, server.playerTokens, server.maxPlayers, server.playing, gameId);
                        serversFound++;
                        if (serversFound >= 16) break;
                    }
                }

                if (serversFound <= 0) {
                    notifications('No Servers Found Within The Provided Criteria', 'info', '🔎', '5000');
                }
            } catch (error) {
                ConsoleLogEnabled('[DEBUG] Error in filterServersByPlayerCount:', error);
            } finally {
                Loadingbar(false);
                disableFilterButton(false);
            }
        }

        /*********************************************************************************************************************************************************************************************************************************************
                                                                 Functions for the 4th button

        *********************************************************************************************************************************************************************************************************************************************/

        /*******************************************************
        name of function: random_servers
        description: Fetches servers from two different URLs, combines the results, ensures no duplicates, shuffles the list, and passes the server information to the rbx_card function in a random order. Handles 429 errors with retries.
        *******************************************************/
        async function random_servers() {
            notifications('Finding Random Servers. Please wait 2-5 seconds', 'success', '🔎', '5000');
            // disable the "Load More" button and show the loading bar
            Loadingbar(true);
            disableFilterButton(true);
            disableLoadMoreButton();

            // get the game ID from the URL ik reduent function
            const gameId = getCurrentGameId();

            try {
                // fetch servers from the first URL with retry logic
                const firstUrl = `https://games.roblox.com/v1/games/${gameId}/servers/public?excludeFullGames=true&limit=10`;
                const firstData = await fetchWithRetry(firstUrl, 10); // Retry up to 3 times

                // wait for 1.5 seconds
                await delay(1500);

                // fetch servers from the second URL with retry logic
                const secondUrl = `https://games.roblox.com/v1/games/${gameId}/servers/public?sortOrder=1&excludeFullGames=true&limit=10`;
                const secondData = await fetchWithRetry(secondUrl, 10); // Retry up to 3 times

                // combine the servers from both URLs. Yea im kinda proud of this lmao
                const combinedServers = [...firstData.data, ...secondData.data];

                // remove duplicates by server ID
                const uniqueServers = [];
                const seenServerIds = new Set();

                for (const server of combinedServers) {
                    if (!seenServerIds.has(server.id)) {
                        seenServerIds.add(server.id);
                        uniqueServers.push(server);
                    }
                }

                // shuffl;y it
                const shuffledServers = shuffleArray(uniqueServers);

                // get first 16 shuffled
                const selectedServers = shuffledServers.slice(0, 16);

                // random order
                for (const server of selectedServers) {
                    const {
                        id: serverId,
                        playerTokens,
                        maxPlayers,
                        playing
                    } = server;

                    // give it to this function
                    await rbx_card(serverId, playerTokens, maxPlayers, playing, gameId);
                }
            } catch (error) {
                ConsoleLogEnabled('Error fetching server data:', error);
                notifications('Error: Failed to fetch server data. Please try again later.', 'error', '⚠️', '5000');
            } finally {
                // hide the loading bar and enable the filter button
                Loadingbar(false);
                disableFilterButton(false);
            }
        }



        /*******************************************************
        name of function: fetchWithRetry
        description: Fetches data from a URL with retry logic for 429 errors using GM_xmlhttpRequest.
        *******************************************************/
        function fetchWithRetry(url, retries) {
            return new Promise((resolve, reject) => {
                const attemptFetch = (attempt = 0) => {
                    GM_xmlhttpRequest({
                        method: "GET",
                        url: url,
                        onload: function(response) {
                            if (response.status === 429) {
                                if (attempt < retries) {
                                    ConsoleLogEnabled(`Rate limited. Retrying in 2.5 seconds... (Attempt ${attempt + 1}/${retries})`);
                                    setTimeout(() => attemptFetch(attempt + 1), 1500); // wait 1.5 seconds and retry
                                } else {
                                    reject(new Error('Rate limit exceeded after retries'));
                                }
                            } else if (response.status >= 200 && response.status < 300) {
                                try {
                                    const data = JSON.parse(response.responseText);
                                    resolve(data);
                                } catch (error) {
                                    reject(new Error('Failed to parse JSON response'));
                                }
                            } else {
                                reject(new Error(`HTTP error: ${response.status}`));
                            }
                        },
                        onerror: function(error) {
                            if (attempt < retries) {
                                ConsoleLogEnabled(`Error occurred. Retrying in 10 seconds... (Attempt ${attempt + 1}/${retries})`);
                                setTimeout(() => attemptFetch(attempt + 1), 10000); // wait 10 seconds and retry
                            } else {
                                reject(error);
                            }
                        }
                    });
                };

                attemptFetch();
            });
        }

        /*******************************************************
        name of function: shuffleArray
        description: Shuffles an array using the Fisher-Yates algorithm. This ronald fisher guy was kinda smart
        *******************************************************/
        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
                [array[i], array[j]] = [array[j], array[i]]; // swap elements
            }
            return array;
        }


        /*********************************************************************************************************************************************************************************************************************************************
                                                                 Functions for the 5th button. taken from my other project

        *********************************************************************************************************************************************************************************************************************************************/

        /*******************************************************
        name of function: Isongamespage
        description: not a function but if on game page inject styles
        *******************************************************/
        if (Isongamespage) {
            // global styles for serverfilters to use
            const style = document.createElement('style');
            style.textContent = `
/* Overlay for the modal background */
.overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.85); /* Solid black overlay */
    z-index: 1000; /* Ensure overlay is below the popup */
    opacity: 0; /* Start invisible */
    animation: fadeIn 0.3s ease forwards; /* Fade-in animation */
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

/* Popup Container for the server region */
.filter-popup {
    background-color: #1e1e1e; /* Darker background */
    color: #ffffff; /* White text */
    padding: 25px;
    border-radius: 12px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
    width: 320px;
    max-width: 90%;
    position: fixed; /* Fixed positioning */
    top: 50%; /* Center vertically */
    left: 50%; /* Center horizontally */
    transform: translate(-50%, -50%); /* Offset to truly center */
    text-align: center;
    z-index: 1001; /* Ensure popup is above the overlay */
    border: 1px solid #444; /* Subtle border */
    opacity: 0; /* Start invisible */
    animation: fadeInPopup 0.3s ease 0.1s forwards; /* Fade-in animation with delay */
}

@keyframes fadeInPopup {
    from {
        opacity: 0;
        transform: translate(-50%, -55%); /* Slight upward offset */
    }
    to {
        opacity: 1;
        transform: translate(-50%, -50%); /* Center position */
    }
}

/* Fade-out animation for overlay and popup */
.overlay.fade-out {
    animation: fadeOut 0.3s ease forwards;
}

.filter-popup.fade-out {
    animation: fadeOutPopup 0.3s ease forwards;
}

@keyframes fadeOut {
    from {
        opacity: 1;
    }
    to {
        opacity: 0;
    }
}

@keyframes fadeOutPopup {
    from {
        opacity: 1;
        transform: translate(-50%, -50%); /* Center position */
    }
    to {
        opacity: 0;
        transform: translate(-50%, -55%); /* Slight upward offset */
    }
}

/* Label */
.filter-popup label {
    display: block;
    margin-bottom: 12px;
    font-size: 16px;
    color: #ffffff;
    font-weight: 500; /* Slightly bolder text */
}

/* Dropdown */
.filter-popup select {
    background-color: #333; /* Darker gray background */
    color: #ffffff; /* White text */
    padding: 10px;
    border-radius: 6px;
    border: 1px solid #555; /* Darker border */
    width: 100%;
    margin-bottom: 12px;
    font-size: 14px;
    transition: border-color 0.3s ease;
}

.filter-popup select:focus {
    border-color: #888; /* Lighter border on focus */
    outline: none;
}

/* Custom Input */
.filter-popup input[type="number"] {
    background-color: #333; /* Darker gray background */
    color: #ffffff; /* White text */
    padding: 10px;
    border-radius: 6px;
    border: 1px solid #555; /* Darker border */
    width: 100%;
    margin-bottom: 12px;
    font-size: 14px;
    transition: border-color 0.3s ease;
}

.filter-popup input[type="number"]:focus {
    border-color: #888; /* Lighter border on focus */
    outline: none;
}

/* Confirm Button */
#confirmServerCount {
    background-color: #444; /* Dark gray background */
    color: #ffffff; /* White text */
    padding: 10px 20px;
    border: 1px solid #666; /* Gray border */
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    width: 100%;
    transition: background-color 0.3s ease, transform 0.2s ease;
}

#confirmServerCount:hover {
    background-color: #555; /* Lighter gray on hover */
    transform: translateY(-1px); /* Slight lift effect */
}

#confirmServerCount:active {
    transform: translateY(0); /* Reset lift effect on click */
}

/* Highlighted server item */
.rbx-game-server-item.highlighted {
    border: 2px solid #4caf50; /* Green border */
    border-radius: 8px;
    background-color: rgba(76, 175, 80, 0.1); /* Subtle green background */
}

/* Disabled fetch button */
.fetch-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Popup Header for server coutnodwn */
.popup-header {
    margin-bottom: 24px;
    text-align: left;
    padding: 16px;
    background-color: rgba(255, 255, 255, 0.05); /* Subtle background for contrast */
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1); /* Subtle border */
    transition: background-color 0.3s ease, border-color 0.3s ease;
}

.popup-header:hover {
    background-color: rgba(255, 255, 255, 0.08); /* Slightly brighter on hover */
    border-color: rgba(255, 255, 255, 0.2);
}

.popup-header h3 {
    margin: 0 0 12px 0;
    font-size: 22px;
    color: #ffffff;
    font-weight: 700; /* Bolder for emphasis */
    letter-spacing: -0.5px; /* Tighter letter spacing for modern look */
}

.popup-header p {
    margin: 0;
    font-size: 14px;
    color: #cccccc;
    line-height: 1.6;
    opacity: 0.9;
}

/* Popup Footer */
.popup-footer {
    margin-top: 20px;
    text-align: left;
    font-size: 14px;
    color: #ffcc00; /* Yellow color for warnings */
    background-color: rgba(255, 204, 0, 0.15); /* Lighter yellow background */
    padding: 12px;
    border-radius: 8px;
    border: 1px solid rgba(255, 204, 0, 0.15); /* Subtle border */
    transition: background-color 0.3s ease, border-color 0.3s ease;
}

.popup-footer:hover {
    background-color: rgba(255, 204, 0, 0.25); /* Slightly brighter on hover */
    border-color: rgba(255, 204, 0, 0.25);
}

.popup-footer p {
    margin: 0;
    line-height: 1.5;
    font-weight: 500; /* Slightly bolder for emphasis */
}

/* Label */
.filter-popup label {
    display: block;
    margin-bottom: 12px;
    font-size: 15px;
    color: #ffffff;
    font-weight: 500;
    text-align: left;
    opacity: 0.9; /* Slightly transparent for a softer look */
    transition: opacity 0.3s ease;
}

.filter-popup label:hover {
    opacity: 1; /* Fully opaque on hover */
}

select:hover, select:focus {
    border-color: #ffffff;
    outline: none;
}


    `;
            // add element to the document head
            document.head.appendChild(style);
        }




        /*******************************************************
        name of function: showMessage
        description: Shows the good looking messages on the bottom of server region search
        *******************************************************/
        function showMessage(message) {
            const loadMoreButtonContainer = document.querySelector('.rbx-public-running-games-footer');

            if (!loadMoreButtonContainer) {
                ConsoleLogEnabled("Error: 'Load More' button container not found! Ensure the element exists in the DOM.");
                return;
            }

            const existingMessage = loadMoreButtonContainer.querySelector('.premium-message-container');

            // If message is "END", remove any existing message and exit
            if (message === "END") {
                if (existingMessage) {
                    existingMessage.remove();
                    ConsoleLogEnabled("Message container removed.");
                } else {
                    ConsoleLogEnabled("No message container found to remove.");
                }
                return;
            }

            // Remove existing message if present before showing a new one
            if (existingMessage) {
                existingMessage.remove();
                ConsoleLogEnabled("Warning: An existing message was found and replaced.");
            }

            // Inject CSS only once
            if (!document.getElementById('premium-message-styles')) {
                const style = document.createElement('style');
                style.id = 'premium-message-styles';
                style.textContent = `
            .premium-message-container {
                margin-top: 20px;
                padding: 18px 26px;
                background: linear-gradient(145deg, #2b0000, #1a0000);
                border-radius: 14px;
                box-shadow: 0 6px 20px rgba(255, 0, 0, 0.2);
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 16px;
                color: #ffdddd;
                transition: all 0.3s ease-in-out, transform 0.3s ease, box-shadow 0.3s ease;
                opacity: 0;
                animation: fadeIn 0.6s ease forwards;
                border: 1px solid #440000;
                display: flex;
                align-items: center;
                gap: 16px;
                cursor: default;
                user-select: none;
            }

            .premium-message-container:hover {
                transform: scale(1.015);
                box-shadow: 0 8px 24px rgba(255, 0, 0, 0.25);
                background: linear-gradient(145deg, #330000, #220000);
                color: #ffe5e5;
            }

            .premium-message-logo {
                width: 28px;
                height: 28px;
                border-radius: 6px;
                object-fit: contain;
                box-shadow: 0 0 8px rgba(255, 0, 0, 0.2);
                background-color: #000;
            }

            .premium-message-text {
                flex: 1;
                text-align: left;
                font-weight: 500;
                letter-spacing: 0.3px;
            }

            @keyframes fadeIn {
                to { opacity: 1; }
            }
        `;
                document.head.appendChild(style);
            }

            // Create the message container
            const container = document.createElement('div');
            container.className = 'premium-message-container';

            // Create and insert the logo
            const logo = document.createElement('img');
            logo.className = 'premium-message-logo';
            logo.src = window.Base64Images.logo;

            // Create and insert the message text
            const messageText = document.createElement('div');
            messageText.className = 'premium-message-text';
            messageText.textContent = message;

            // Build the full component
            container.appendChild(logo);
            container.appendChild(messageText);
            loadMoreButtonContainer.appendChild(container);

            ConsoleLogEnabled("Message displayed successfully:", message);
            return container;
        }


        /*******************************************************
        name of function: delay
        description: custom delay also known as sleep function in js cause this language sucks and doesent have a default built-in sleep.
        *******************************************************/
        function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        /*******************************************************
         name of function: createServerCountPopup
         description: Creates the first time popup and allows user to pick the amount of servers they want.
         *******************************************************/
        // WARNING: Do not republish this script. Licensed for personal use only.
        function createServerCountPopup(callback) {
            const overlay = document.createElement('div');
            overlay.className = 'overlay';

            const popup = document.createElement('div');
            popup.className = 'filter-popup';

            // get current player count preference from localStorage
            const currentPlayerCountPreference = localStorage.getItem('ROLOCATE_invertplayercount');
            const isLowPlayerCount = currentPlayerCountPreference === 'true';

            // inject styles for dropdown icon and mobile responsiveness
            const style = document.createElement('style');
            style.textContent = `
            .overlay {
                z-index: 10000;
            }

            .filter-popup {
                width: 90%;
                max-width: 460px;
                max-height: 90vh;
                margin: 0 auto;
                box-sizing: border-box;
                overflow-y: auto;
                z-index: 10001;
            }

            .filter-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 15px;
            }

            @media (max-width: 600px) {
                .filter-grid {
                    grid-template-columns: 1fr;
                    gap: 15px;
                }

                .filter-popup {
                    width: 95%;
                    padding: 20px 15px;
                }

                .popup-header h3 {
                    font-size: 18px;
                }

                .popup-header p {
                    font-size: 13px;
                }

                .popup-footer p {
                    font-size: 12px;
                }
            }

            /* Very small screens */
            @media (max-width: 400px) {
                .filter-popup {
                    width: 98%;
                    padding: 15px 10px;
                }

                .popup-header h3 {
                    font-size: 16px;
                }

                .filter-section label {
                    font-size: 13px;
                }

                select, input, button {
                    font-size: 13px;
                }
            }

            .dropdown-wrapper {
                position: relative;
                display: inline-block;
                width: 100%;
            }

            .dropdown-wrapper select {
                width: 100%;
                padding-right: 30px;
                appearance: none;
                -webkit-appearance: none;
                -moz-appearance: none;
                box-sizing: border-box;
            }

            .dropdown-wrapper .dropdown-icon {
                position: absolute;
                right: 10px;
                top: 40%;
                transform: translateY(-50%);
                pointer-events: none;
                font-size: 12px;
                color: #fff;
            }

            .filter-section label {
                display: block;
                margin-bottom: 5px;
                font-weight: 600;
            }

            #cancelServerCount {
                background-color: #2a1f1f;
                border: 1px solid #3d2626;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
                transition: background-color 0.3s ease, transform 0.2s ease;
            }

            #cancelServerCount:hover {
                background-color: #332222;
                transform: translateY(-1px);
            }

            #cancelServerCount:active {
                transform: translateY(0);
            }

            /* Ensure buttons are touch-friendly on mobile */
            @media (max-width: 600px) {
                button {
                    padding: 12px;
                    min-height: 44px;
                }
            }
        `;
            document.head.appendChild(style);

            popup.innerHTML = `
            <div class="popup-header">
                <h3>Select Number of Servers</h3>
                <p><strong>More servers = more variety, but longer search times.</strong></p>
            </div>

            <div class="filter-grid">
                <div class="filter-section">
                    <label for="serverCount">Number of Servers:</label>
                    <div class="dropdown-wrapper">
                        <select id="serverCount">
                            <option value="10">10 Servers</option>
                            <option value="25">50 Servers</option>
                            <option value="100" selected>100 Servers</option>
                            <option value="200">200 Servers</option>
                            <option value="500">500 Servers</option>
                            <option value="700">700 Servers</option>
                            <option value="custom">Custom</option>
                        </select>
                        <span class="dropdown-icon">▼</span>
                    </div>
                    <input id="customServerCount" type="number" min="1" max="700" placeholder="Enter number (1–700)" style="display: none; margin-top: 5px; width: calc(100% - 10px); box-sizing: border-box;">
                </div>

                <div class="filter-section">
                    <label for="playerCountFilter">Find Servers with:</label>
                    <div class="dropdown-wrapper">
                        <select id="playerCountFilter">
                            <option value="high" ${!isLowPlayerCount ? 'selected' : ''}>High Player Counts</option>
                            <option value="low" ${isLowPlayerCount ? 'selected' : ''}>Low Player Counts</option>
                        </select>
                        <span class="dropdown-icon">▼</span>
                    </div>
                </div>
            </div>

            <div class="popup-footer" style="text-align: left; margin-top: 0;">
                <p><strong>Note:</strong> If you have fast servers on, the buildman thumbnails are intentional! It's because it saves time for the search.</p>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button id="cancelServerCount" style="width:25%;">Cancel</button>
                <button id="confirmServerCount" style="width: 75%;">Confirm</button>
            </div>
        `;

            document.body.appendChild(overlay);
            document.body.appendChild(popup);

            const serverCountDropdown = popup.querySelector('#serverCount');
            const customServerCountInput = popup.querySelector('#customServerCount');
            const playerCountFilter = popup.querySelector('#playerCountFilter');
            const confirmButton = popup.querySelector('#confirmServerCount');
            const cancelButton = popup.querySelector('#cancelServerCount');

            serverCountDropdown.addEventListener('change', () => {
                if (serverCountDropdown.value === 'custom') {
                    customServerCountInput.style.display = 'block';
                } else {
                    customServerCountInput.style.display = 'none';
                }
            });

            confirmButton.addEventListener('click', () => {
                let serverCount;

                if (serverCountDropdown.value === 'custom') {
                    serverCount = parseInt(customServerCountInput.value);
                    if (isNaN(serverCount) || serverCount < 1 || serverCount > 2000) {
                        notifications('Error: Please enter a valid number between 1 and 2000.', 'error', '⚠️', '5000');
                        return;
                    }
                } else {
                    serverCount = parseInt(serverCountDropdown.value);
                }

                const playerCountPreference = playerCountFilter.value;
                localStorage.setItem('ROLOCATE_invertplayercount', playerCountPreference === 'low' ? 'true' : 'false');

                callback(serverCount);
                disableFilterButton(true);
                disableLoadMoreButton(true);
                hidePopup();
                Loadingbar(true);
            });

            cancelButton.addEventListener('click', () => {
                hidePopup();
            });

            function hidePopup() {
                const overlay = document.querySelector('.overlay');
                const popup = document.querySelector('.filter-popup');

                overlay.classList.add('fade-out');
                popup.classList.add('fade-out');

                setTimeout(() => {
                    overlay.remove();
                    popup.remove();
                }, 300);
            }
        }

        /*******************************************************
        name of function: fetchPublicServers
        description: Function to fetch public servers with rate limtiing and stuff (Server regions)
        *******************************************************/
        // WARNING: Do not republish this script. Licensed for personal use only.
        async function fetchPublicServers(gameId, totalLimit) {
            let servers = [];
            let cursor = null;
            let delayTime = 250; // Start with 0.25 seconds
            let retryingDueToRateLimit = false;
            let pageCount = 0;

            const invertPlayerCount = localStorage.getItem("ROLOCATE_invertplayercount") === "true";

            ConsoleLogEnabled(`Starting to fetch up to ${totalLimit} public servers for game ${gameId}...`);
            ConsoleLogEnabled(`Invert player count: ${invertPlayerCount}`);

            while (servers.length < totalLimit) {
                const url = `https://games.roblox.com/v1/games/${gameId}/servers/public?excludeFullGames=true&limit=100${invertPlayerCount ? '&sortOrder=1' : ''}${cursor ? `&cursor=${cursor}` : ''}`;

                pageCount++;
                ConsoleLogEnabled(`Fetching page ${pageCount}... (Current delay: ${delayTime}ms)`);

                let responseData;
                try {
                    responseData = await new Promise((resolve, reject) => {
                        GM_xmlhttpRequest({
                            method: "GET",
                            url: url,
                            onload: function(response) {
                                if (response.status === 429 || !response.responseText) {
                                    reject({
                                        rateLimited: true
                                    });
                                } else {
                                    try {
                                        const json = JSON.parse(response.responseText);
                                        resolve(json);
                                    } catch (err) {
                                        reject({
                                            rateLimited: true
                                        });
                                    }
                                }
                            },
                            onerror: function(error) {
                                reject({
                                    rateLimited: false,
                                    error
                                });
                            },
                        });
                    });

                    if (retryingDueToRateLimit) {
                        delayTime = 250;
                        retryingDueToRateLimit = false;
                        ConsoleLogEnabled(`Rate limit cleared. Resuming normal delay (${delayTime}ms).`);
                    }

                    const newServers = responseData.data || [];
                    servers = servers.concat(newServers);
                    ConsoleLogEnabled(`Fetched ${newServers.length} servers (Total: ${servers.length}/${totalLimit})`);

                    if (!responseData.nextPageCursor || servers.length >= totalLimit) {
                        ConsoleLogEnabled("No more pages or reached limit.");
                        break;
                    }

                    cursor = responseData.nextPageCursor;

                } catch (err) {
                    if (err.rateLimited) {
                        delayTime = 750;
                        retryingDueToRateLimit = true;
                        ConsoleLogEnabled("⚠️ Rate limited. Increasing delay to 0.75s...");
                    } else {
                        ConsoleLogEnabled("❌ Failed to fetch due to error:", err.error);
                        break;
                    }
                }

                await delay(delayTime);
            }

            ConsoleLogEnabled(`✅ Done. Fetched ${servers.length} servers in total.`);
            return servers.slice(0, totalLimit);
        }




        /*******************************************************
        name of function: createFilterDropdowns
        description: Creates the server selecting dropdown with country flags.
        *******************************************************/
        function createFilterDropdowns(servers) {
            // get flag data
            getFlagEmoji(); // load flag data without country code
            const serverRegionsPrefs = JSON.parse(localStorage.getItem('ROLOCATE_serverRegions') || '{}');

            // create the main filter container with premium styling
            const filterContainer = document.createElement('div');
            Object.assign(filterContainer.style, {
                display: 'flex',
                gap: '16px',
                alignItems: 'center',
                padding: '20px 24px',
                background: 'linear-gradient(145deg, rgba(12,12,12,0.98) 0%, rgba(8,8,8,0.98) 25%, rgba(15,10,10,0.98) 75%, rgba(10,8,8,0.98) 100%)',
                borderRadius: '28px',
                boxShadow: '0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,30,30,0.15), inset 0 1px 0 rgba(255,255,255,0.02)',
                opacity: '0',
                transform: 'translateY(-50px) scale(0.94)',
                transition: 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
                border: '1px solid rgba(200,30,30,0.12)',
                margin: '40px',
                fontFamily: "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif",
                fontSize: '16px',
                overflow: 'hidden'
            });

            // premium animated border with subtle red glow
            const borderGlow = document.createElement('div');
            Object.assign(borderGlow.style, {
                position: 'absolute',
                inset: '-2px',
                borderRadius: '30px',
                pointerEvents: 'none',
                background: 'linear-gradient(60deg, rgba(200,25,25,0.25), rgba(50,50,50,0.1), rgba(200,25,25,0.15), rgba(30,30,30,0.1), rgba(200,25,25,0.2))',
                backgroundSize: '300% 300%',
                zIndex: '-1',
                animation: 'premiumFlow 20s ease infinite',
                opacity: '0.7'
            });
            filterContainer.appendChild(borderGlow);

            // add premium CSS animations and styling
            const style = document.createElement('style');
            style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        @keyframes premiumFlow {
            0% { background-position: 0% 50%; transform: rotate(0deg); }
            25% { background-position: 100% 25%; }
            50% { background-position: 100% 100%; transform: rotate(0.5deg); }
            75% { background-position: 0% 75%; }
            100% { background-position: 0% 50%; transform: rotate(0deg); }
        }

        @keyframes premiumPulse {
            0% { box-shadow: 0 0 0 0 rgba(200, 30, 30, 0.4); }
            50% { box-shadow: 0 0 0 20px rgba(200, 30, 30, 0); }
            100% { box-shadow: 0 0 0 0 rgba(200, 30, 30, 0); }
        }

        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }

        @keyframes iconFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-2px); }
        }

        .premium-select {
            scrollbar-width: thin;
            scrollbar-color: rgba(200,30,30,0.6) rgba(20,20,20,0.4);
        }

        .premium-select::-webkit-scrollbar {
            width: 6px;
        }
        .premium-select::-webkit-scrollbar-track {
            background: rgba(15,15,15,0.8);
            border-radius: 10px;
        }
        .premium-select::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, rgba(200,30,30,0.8), rgba(150,25,25,0.6));
            border-radius: 10px;
            border: 1px solid rgba(0,0,0,0.2);
        }
        .premium-select::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, rgba(220,35,35,0.9), rgba(170,30,30,0.7));
        }

        .logo-premium-pulse {
            animation: premiumPulse 3s infinite;
        }

        .shimmer-effect {
            position: relative;
            overflow: hidden;
        }

        .shimmer-effect::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
            animation: shimmer 3s infinite;
        }

        .premium-icon {
            animation: iconFloat 3s ease-in-out infinite;
        }

        /* for the confetti easter egg */
        @keyframes fall {
            to { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }

        .flag-image {
            width: 26px !important; /* Slightly larger */
            height: 20px !important; /* Slightly larger */
            object-fit: cover;
            object-position: center;
            overflow: hidden;
            border-radius: 3px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            flex-shrink: 0;
            /* Crop the edges to hide outline */
            clip-path: inset(1px 1px 1px 1px);
        }

        /* Custom select styling for flags */
        .premium-select option {
            padding: 12px 16px;
            background: rgba(15,15,15,0.98) !important;
            color: rgba(200,30,30,0.9) !important;
            border-radius: 8px;
            margin: 2px;
            display: flex;
            align-items: center;
        }
    `;
            document.head.appendChild(style);

            // easter egg :)
            const createConfetti = () => {
                const c = document.createElement('div');
                Object.assign(c.style, {position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '9999'});
                document.body.appendChild(c);
                for (let i = 0; i < 20; i++) {
                    const p = document.createElement('div');
                    Object.assign(p.style, {position: 'absolute', width: '8px', height: '8px', backgroundColor: ['#c81e1e','#ff3333','#fff'][i%3], top: '-20px', left: Math.random()*100+'%', animation: `fall ${2+Math.random()*2}s linear ${Math.random()*0.3}s forwards`});
                    c.appendChild(p);
                }
                setTimeout(() => document.body.removeChild(c), 4500);
            };

            // colors
            const logoWrapper = document.createElement('div');
            Object.assign(logoWrapper.style, {
                position: 'relative',
                marginRight: '36px',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer'
            });

            const logoContainer = document.createElement('div');
            Object.assign(logoContainer.style, {
                position: 'relative',
                padding: '8px',
                borderRadius: '20px',
                background: 'linear-gradient(145deg, rgba(25,25,25,0.8), rgba(15,15,15,0.9))',
                border: '1px solid rgba(200,30,30,0.2)',
                transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
            });

            const logo = document.createElement('img');
            logo.src = window.Base64Images.logo;
            Object.assign(logo.style, {
                width: '64px',
                height: '64px',
                borderRadius: '14px',
                transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                filter: 'drop-shadow(0 12px 24px rgba(200,30,30,0.4))',
                border: '2px solid rgba(200,30,30,0.3)',
            });

            const logoGlow = document.createElement('div');
            Object.assign(logoGlow.style, {
                position: 'absolute',
                inset: '-6px',
                borderRadius: '24px',
                background: 'radial-gradient(circle at center, rgba(200,30,30,0.5) 0%, rgba(200,30,30,0.1) 50%, transparent 70%)',
                opacity: '0',
                transition: 'all 0.6s ease',
                pointerEvents: 'none',
                zIndex: '-1',
            });

            // Premium logo interactions
            logoContainer.addEventListener('mouseover', () => {
                logo.style.transform = 'rotate(-6deg) scale(1.12)';
                logo.style.filter = 'drop-shadow(0 16px 32px rgba(200,30,30,0.6))';
                logo.style.border = '2px solid rgba(200,30,30,0.7)';
                logoContainer.style.background = 'linear-gradient(145deg, rgba(35,35,35,0.9), rgba(20,20,20,0.95))';
                logoContainer.style.border = '1px solid rgba(200,30,30,0.4)';
                logoGlow.style.opacity = '1';
                logo.classList.add('logo-premium-pulse');
            });

            logoContainer.addEventListener('mouseout', () => {
                logo.style.transform = 'rotate(0) scale(1)';
                logo.style.filter = 'drop-shadow(0 12px 24px rgba(200,30,30,0.4))';
                logo.style.border = '2px solid rgba(200,30,30,0.3)';
                logoContainer.style.background = 'linear-gradient(145deg, rgba(25,25,25,0.8), rgba(15,15,15,0.9))';
                logoContainer.style.border = '1px solid rgba(200,30,30,0.2)';
                logoGlow.style.opacity = '0';
                logo.classList.remove('logo-premium-pulse');
                logoContainer.addEventListener('click', () => {
                    createConfetti();
                });
            });

            logoContainer.appendChild(logoGlow);
            logoContainer.appendChild(logo);
            logoWrapper.appendChild(logoContainer);
            filterContainer.appendChild(logoWrapper);

            // create icons
            const createIcon = (type) => {
                const iconMap = {
                    globe: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 2a14.5 14.5 0 0 1 0 20 14.5 14.5 0 0 1 0-20z"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
                    city: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="6" height="12" rx="1"/><rect x="13" y="5" width="6" height="16" rx="1"/><rect x="5" y="12" width="2" height="2" rx="0.5"/><rect x="5" y="16" width="2" height="2" rx="0.5"/><rect x="15" y="8" width="2" height="2" rx="0.5"/><rect x="15" y="12" width="2" height="2" rx="0.5"/><rect x="15" y="16" width="2" height="2" rx="0.5"/></svg>`,
                    version: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 2.5v6.527a2 2 0 0 1-.211.896L5.22 19.55a1 1 0 0 0 .9 1.45h11.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 13.5 9.027V2.5"/><path d="M8.5 2.5h7"/><path d="M7 15.5h10"/></svg>`,
                    chevron: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`
                };
                return iconMap[type] || '';
            };

            // function to get country code from country name
            const getCountryCode = (countryName) => {
                // name to code name 2 letter name yea daskdha
                const countryCodeMap = {
                    'Australia': 'AU',
                    'Brazil': 'BR',
                    'Germany': 'DE',
                    'France': 'FR',
                    'United Kingdom': 'GB',
                    'Hong Kong': 'HK',
                    'India': 'IN',
                    'Japan': 'JP',
                    'Netherlands': 'NL',
                    'Poland': 'PL',
                    'Singapore': 'SG',
                    'United States': 'US',
                    'Ireland': 'IE'
                };

                // Return the country code or the first two letters of the country name as fallback
                return countryCodeMap[countryName] || countryName.substring(0, 2).toUpperCase();
            };

            // Function to create a premium dropdown with enhanced styling and icons
            const createDropdown = (id, placeholder, iconType) => {
                const wrapper = document.createElement('div');
                Object.assign(wrapper.style, {
                    position: 'relative',
                    minWidth: '200px',
                    flex: '1'
                });

                // Premium label with icon
                const labelContainer = document.createElement('div');
                Object.assign(labelContainer.style, {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '14px',
                    opacity: '0',
                    transform: 'translateX(-10px)',
                    transition: 'all 0.6s ease'
                });

                const labelIcon = document.createElement('span');
                labelIcon.innerHTML = createIcon(iconType);
                labelIcon.className = 'premium-icon';
                Object.assign(labelIcon.style, {
                    color: 'rgba(200,30,30,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    filter: 'drop-shadow(0 2px 4px rgba(200,30,30,0.3))'
                });

                const label = document.createElement('div');
                label.textContent = placeholder.replace('All ', '').toUpperCase();
                Object.assign(label.style, {
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: '13px',
                    fontWeight: '600',
                    letterSpacing: '1px',
                    transition: 'all 0.4s ease',
                    fontFamily: "'Inter', sans-serif"
                });

                labelContainer.appendChild(labelIcon);
                labelContainer.appendChild(label);
                wrapper.appendChild(labelContainer);

                // Premium dropdown with enhanced design
                const dropdownContainer = document.createElement('div');
                dropdownContainer.className = 'shimmer-effect';
                Object.assign(dropdownContainer.style, {
                    position: 'relative',
                    borderRadius: '16px',
                    background: 'linear-gradient(145deg, rgba(20,20,20,0.95), rgba(12,12,12,0.98))',
                    border: '1px solid rgba(200,30,30,0.15)',
                    overflow: 'hidden',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)'
                });

                const dropdown = document.createElement('select');
                dropdown.id = id;
                dropdown.className = 'premium-select';
                dropdown.innerHTML = `<option value="">${placeholder}</option>`;
                Object.assign(dropdown.style, {
                    width: '100%',
                    padding: '20px 60px 20px 28px',
                    fontSize: '16px',
                    fontWeight: '500',
                    background: 'transparent',
                    color: 'rgba(200,30,30,0.95)',
                    border: 'none',
                    borderRadius: '16px',
                    appearance: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    opacity: '0',
                    transform: 'translateY(-25px)',
                    letterSpacing: '0.4px',
                    fontFamily: "'Inter', sans-serif",
                    outline: 'none'
                });

                // Premium chevron with enhanced styling
                const chevronContainer = document.createElement('div');
                Object.assign(chevronContainer.style, {
                    position: 'absolute',
                    right: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    color: 'rgba(200,30,30,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px',
                    borderRadius: '8px',
                    background: 'rgba(200,30,30,0.1)',
                    border: '1px solid rgba(200,30,30,0.2)'
                });
                chevronContainer.innerHTML = createIcon('chevron');

                // Enhanced dropdown interactions with premium effects
                const addHoverEffect = () => {
                    dropdownContainer.style.background = 'linear-gradient(145deg, rgba(30,30,30,0.98), rgba(18,18,18,1))';
                    dropdownContainer.style.boxShadow = '0 20px 40px rgba(0,0,0,0.5), 0 0 0 2px rgba(200,30,30,0.3), inset 0 1px 0 rgba(255,255,255,0.05)';
                    dropdownContainer.style.border = '1px solid rgba(200,30,30,0.3)';
                    dropdownContainer.style.transform = 'translateY(-2px)';
                    label.style.color = 'rgba(200,30,30,0.95)';
                    labelIcon.style.color = 'rgba(200,30,30,1)';
                    chevronContainer.style.transform = 'translateY(-50%) rotate(180deg)';
                    chevronContainer.style.background = 'rgba(200,30,30,0.2)';
                    chevronContainer.style.border = '1px solid rgba(200,30,30,0.4)';
                };

                const removeHoverEffect = () => {
                    if (document.activeElement !== dropdown) {
                        dropdownContainer.style.background = 'linear-gradient(145deg, rgba(20,20,20,0.95), rgba(12,12,12,0.98))';
                        dropdownContainer.style.boxShadow = '0 12px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)';
                        dropdownContainer.style.border = '1px solid rgba(200,30,30,0.15)';
                        dropdownContainer.style.transform = 'translateY(0)';
                        label.style.color = 'rgba(255,255,255,0.85)';
                        labelIcon.style.color = 'rgba(200,30,30,0.8)';
                        chevronContainer.style.transform = 'translateY(-50%) rotate(0deg)';
                        chevronContainer.style.background = 'rgba(200,30,30,0.1)';
                        chevronContainer.style.border = '1px solid rgba(200,30,30,0.2)';
                    }
                };

                dropdownContainer.addEventListener('mouseover', addHoverEffect);
                dropdownContainer.addEventListener('mouseout', removeHoverEffect);

                dropdown.addEventListener('focus', () => {
                    dropdownContainer.style.outline = 'none';
                    dropdownContainer.style.border = '1px solid rgba(200,30,30,0.5)';
                    dropdownContainer.style.boxShadow = '0 20px 40px rgba(0,0,0,0.5), 0 0 0 4px rgba(200,30,30,0.25), inset 0 1px 0 rgba(255,255,255,0.05)';
                    label.style.color = 'rgba(200,30,30,1)';
                    labelIcon.style.color = 'rgba(200,30,30,1)';
                    chevronContainer.style.transform = 'translateY(-50%) rotate(180deg)';
                });

                dropdown.addEventListener('blur', removeHoverEffect);

                dropdown.addEventListener('change', () => {
                    // Premium selection animation
                    dropdownContainer.style.transform = 'translateY(-2px) scale(0.98)';
                    setTimeout(() => {
                        dropdownContainer.style.transform = 'translateY(-2px) scale(1)';
                    }, 150);

                    // Enhanced flash effect
                    const flash = document.createElement('div');
                    Object.assign(flash.style, {
                        position: 'absolute',
                        inset: '0',
                        borderRadius: '16px',
                        background: 'linear-gradient(145deg, rgba(200,30,30,0.2), rgba(200,30,30,0.1))',
                        pointerEvents: 'none',
                        opacity: '0',
                        transition: 'opacity 0.4s ease'
                    });
                    dropdownContainer.appendChild(flash);
                    flash.style.opacity = '1';
                    setTimeout(() => {
                        flash.style.opacity = '0';
                        setTimeout(() => dropdownContainer.removeChild(flash), 400);
                    }, 80);
                });

                // Staggered fade-in animation
                setTimeout(() => {
                    labelContainer.style.opacity = '1';
                    labelContainer.style.transform = 'translateX(0)';
                }, 400);

                setTimeout(() => {
                    dropdown.style.opacity = '1';
                    dropdown.style.transform = 'translateY(0)';
                }, 600);

                dropdownContainer.appendChild(dropdown);
                dropdownContainer.appendChild(chevronContainer);
                wrapper.appendChild(dropdownContainer);
                return wrapper;
            };

            // Create premium dropdowns with icons
            const countryDropdown = createDropdown('countryFilter', 'All Countries', 'globe');
            const cityDropdown = createDropdown('cityFilter', 'All Cities', 'city');
            const versionDropdown = createDropdown('versionFilter', 'Server Versions', 'version'); // glitch somehwre ein the code but idc

            // server data and flasgs
            const countryCounts = {};
            const countryServerMap = {}; // store server ifno for each one

            servers.forEach(server => {
                const country = server.location.country.name;
                countryCounts[country] = (countryCounts[country] || 0) + 1;
                if (!countryServerMap[country]) {
                    countryServerMap[country] = server; // store first server for country code reference
                }
            });

            const sortedCountries = Object.keys(countryCounts).sort();
            const countrySelect = countryDropdown.querySelector('select');

            sortedCountries.forEach(country => {
                const option = document.createElement('option');
                option.value = country;

                // Try to get country code from server data first, then fallback to mapping
                let countryCode;
                const server = countryServerMap[country];
                if (server && server.location.country.code) {
                    countryCode = server.location.country.code;
                } else {
                    countryCode = getCountryCode(country);
                }

                // Create flag element
                try {
                    const flagImg = getFlagEmoji(countryCode);
                    if (flagImg) {
                        flagImg.className = 'flag-image';
                        // Since we can't directly add HTML to option text, we'll use a data attribute
                        // and handle the display with CSS or JavaScript
                        option.setAttribute('data-flag-src', flagImg.src);
                        option.setAttribute('data-country-code', countryCode);
                        option.textContent = `${country} (${countryCounts[country]})`;
                        // mark country if all or some regions inside are banned
                        try {
                            const serversForCountry = servers.filter(s => s.location.country.name === country);
                            const allBanned = serversForCountry.length > 0 && serversForCountry.every(s => serverRegionsPrefs[`${s.location.city}_${s.location.country?.code}`] === 'banned');
                            const someBanned = serversForCountry.some(s => serverRegionsPrefs[`${s.location.city}_${s.location.country?.code}`] === 'banned');
                            if (allBanned) {
                                option.textContent += ' — BANNED';
                                option.style.color = '#ff6b6b';
                            } else if (someBanned) {
                                option.textContent += ' — PARTIAL BANS';
                                option.style.color = '#f59e0b';
                            }
                        } catch (e) {
                            ConsoleLogEnabled('Error checking banned status for country dropdown:', e);
                        }
                    }
                } catch (error) {
                    ConsoleLogEnabled(`Could not load flag for ${country} (${countryCode}):`, error);
                    option.textContent = `${country} (${countryCounts[country]})`;
                }

                Object.assign(option.style, {
                    background: 'rgba(15,15,15,0.98)',
                    color: 'rgba(200,30,30,0.9)',
                    padding: '12px',
                    borderRadius: '8px',
                    margin: '2px'
                });
                countrySelect.appendChild(option);
            });

            // Create a custom dropdown display that shows flags
            const createCustomDropdownDisplay = (selectElement) => {
                const customDisplay = document.createElement('div');
                Object.assign(customDisplay.style, {
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '20px 60px 20px 28px',
                    pointerEvents: 'none',
                    zIndex: '1',
                    color: 'rgba(200,30,30,0.95)',
                    fontSize: '16px',
                    fontWeight: '500',
                    letterSpacing: '0.4px',
                    fontFamily: "'Inter', sans-serif"
                });

                const updateDisplay = () => {
                    const selectedOption = selectElement.options[selectElement.selectedIndex];
                    if (selectedOption && selectedOption.getAttribute('data-flag-src')) {
                        const flagSrc = selectedOption.getAttribute('data-flag-src');
                        const countryCode = selectedOption.getAttribute('data-country-code');

                        customDisplay.innerHTML = `
                    <img src="${flagSrc}"
                         alt="${countryCode}"
                         class="flag-image"
                         style="width: 24px; height: 18px; margin-right: 12px; border-radius: 3px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);">
                    <span>${selectedOption.textContent}</span>
                `;
                    } else {
                        customDisplay.textContent = selectedOption ? selectedOption.textContent : selectElement.options[0].textContent;
                    }
                };

                selectElement.addEventListener('change', updateDisplay);
                updateDisplay(); // Initial display

                return customDisplay;
            };

            // add custom display to country dropdown
            const countryDropdownContainer = countryDropdown.querySelector('.shimmer-effect');
            const countryCustomDisplay = createCustomDropdownDisplay(countrySelect);
            countryDropdownContainer.appendChild(countryCustomDisplay);

            // make it transparent
            countrySelect.addEventListener('change', () => {
                if (countrySelect.value) {
                    countrySelect.style.color = 'transparent';
                } else {
                    countrySelect.style.color = 'rgba(200,30,30,0.95)';
                }
            });

            // premium separator with gradient
            const separator = document.createElement('div');
            Object.assign(separator.style, {
                height: '80px',
                width: '2px',
                background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(200,30,30,0.4) 20%, rgba(200,30,30,0.6) 50%, rgba(200,30,30,0.4) 80%, rgba(255,255,255,0))',
                margin: '0 8px',
                borderRadius: '2px',
                position: 'relative',
                overflow: 'hidden'
            });

            // Add subtle animation to separator
            const separatorGlow = document.createElement('div');
            Object.assign(separatorGlow.style, {
                position: 'absolute',
                inset: '0',
                background: 'linear-gradient(to bottom, transparent, rgba(200,30,30,0.8), transparent)',
                animation: 'shimmer 4s infinite',
                opacity: '0.3'
            });
            separator.appendChild(separatorGlow);

            // Enhanced country change handler with flag support
            countrySelect.addEventListener('change', () => {
                const selectedCountry = countrySelect.value;
                const citySelect = cityDropdown.querySelector('select');
                citySelect.innerHTML = '<option value="">All Cities</option>';

                    if (selectedCountry) {
                    const cityCounts = {};
                    const cityCountryMap = {};
                    servers
                        .filter(server => server.location.country.name === selectedCountry)
                        .forEach(server => {
                            const city = server.location.city;
                            const region = server.location.region?.name;
                            const cityKey = region ? `${city}, ${region}` : city;
                            cityCounts[cityKey] = (cityCounts[cityKey] || 0) + 1;
                            cityCountryMap[cityKey] = server.location.country.code;
                        });

                    const sortedCities = Object.keys(cityCounts).sort();
                    sortedCities.forEach(city => {
                        const option = document.createElement('option');
                        option.value = city;
                        // annotate banned cities
                        const countryCodeForCity = cityCountryMap[city];
                        const cityNameOnly = city.split(',')[0].trim();
                        const regionKey = `${cityNameOnly}_${countryCodeForCity}`;
                        option.textContent = `${city} (${cityCounts[city]})` + (serverRegionsPrefs[regionKey] === 'banned' ? ' — BANNED' : '');
                        if (serverRegionsPrefs[regionKey] === 'banned') {
                            option.style.color = '#ff6b6b';
                        }
                        Object.assign(option.style, {
                            background: 'rgba(15,15,15,0.98)',
                            color: 'rgba(200,30,30,0.9)',
                            padding: '12px'
                        });
                        citySelect.appendChild(option);
                    });

                    // Premium update animation
                    const cityContainer = cityDropdown.querySelector('div');
                    cityContainer.style.opacity = '0.4';
                    cityContainer.style.transform = 'translateY(-15px)';
                    setTimeout(() => {
                        cityContainer.style.opacity = '1';
                        cityContainer.style.transform = 'translateY(0)';
                    }, 200);

                    // Visual update indicator
                    const updateRipple = document.createElement('div');
                    Object.assign(updateRipple.style, {
                        position: 'absolute',
                        inset: '0',
                        borderRadius: '16px',
                        background: 'radial-gradient(circle at center, rgba(200,30,30,0.3) 0%, rgba(200,30,30,0.1) 40%, transparent 70%)',
                        pointerEvents: 'none',
                        opacity: '1',
                        transition: 'all 1s ease',
                        transform: 'scale(0.8)'
                    });
                    cityDropdown.style.position = 'relative';
                    cityDropdown.appendChild(updateRipple);

                    setTimeout(() => {
                        updateRipple.style.opacity = '0';
                        updateRipple.style.transform = 'scale(1.2)';
                        setTimeout(() => cityDropdown.removeChild(updateRipple), 1000);
                    }, 100);
                }
                // update theis
                populateVersionOptions(countrySelect.value, citySelect.value);
            });

            // function to do stuff like picmversioin
            // hopefulyl works no buggy wuggys
            const versionSelect = versionDropdown.querySelector('select');
            function populateVersionOptions(countryValue, cityValue) {
                const prevValue = versionSelect.value;
                versionSelect.innerHTML = '<option value="">All Versions</option>';
                let candidateServers = servers;
                if (countryValue) candidateServers = candidateServers.filter(s => s.location.country.name === countryValue);
                if (cityValue) {
                    candidateServers = candidateServers.filter(s => `${s.location.city}${s.location.region?.name ? `, ${s.location.region.name}` : ''}` === cityValue);
                }
                const versionsSet = new Set();
                candidateServers.forEach(s => {
                    const v = s.location.placeVersion;
                    if (v != null && v !== 'N/A') versionsSet.add(Number(v));
                });
                const versions = Array.from(versionsSet).sort((a,b) => b - a); // newest on top to oldest
                if (versions.length === 0) return; // safety
                const min = versions[versions.length - 1];
                const max = versions[0];
                versions.forEach(v => {
                    const option = document.createElement('option');
                    option.value = String(v);
                    // label newest and oldest
                    if (v === max) {
                        option.textContent = `Newest (${v})`;
                    } else if (v === min) {
                        option.textContent = `Oldest (${v})`;
                    } else {
                        option.textContent = String(v);
                    }
                    Object.assign(option.style, {
                        background: 'rgba(15,15,15,0.98)',
                        color: 'rgba(200,30,30,0.9)',
                        padding: '12px'
                    });
                    versionSelect.appendChild(option);
                });
                // try to restore previous value if still available
                if (prevValue && Array.from(versionSelect.options).some(o => o.value === prevValue)) {
                    versionSelect.value = prevValue;
                }
            };
            // on city change update versions so no bugs
            const citySelect = cityDropdown.querySelector('select');
            citySelect.addEventListener('change', () => {
                populateVersionOptions(countrySelect.value, citySelect.value);
            });

            // elemtns inside so country city and version
            filterContainer.appendChild(countryDropdown);
            filterContainer.appendChild(cityDropdown);
            filterContainer.appendChild(versionDropdown);

            // add versions in
            populateVersionOptions('', '');

            // Premium container entrance animation
            setTimeout(() => {
                filterContainer.style.opacity = '1';
                filterContainer.style.transform = 'translateY(0) scale(1)';
            }, 200);

            return filterContainer;
        }

        /*******************************************************
        name of function: filterServers
        description: Function to filter servers based on selected country and city cause im lazy
        *******************************************************/
        function filterServers(servers, country, city, version) {
          if (!filterServers.index || filterServers.lastServers !== servers) {
            filterServers.index = new Map();
            filterServers.lastServers = servers;

            for (const s of servers) {
              const countryName = s.location.country.name;
              const cityName = `${s.location.city}${s.location.region?.name ? `, ${s.location.region.name}` : ''}`;

              // hopefully i can remember later on what this does
              const cKey = `country:${countryName}`;
              const cityKey = `city:${countryName}:${cityName}`;
              const placeVersion = s.location.placeVersion;
              const hasValidVersion = placeVersion != null && placeVersion !== 'N/A';
              const versionStr = hasValidVersion ? String(placeVersion) : null;
              const vKey = versionStr ? `version:${versionStr}` : null;
              const cVKey = versionStr ? `version:${countryName}:${versionStr}` : null;
              const cityVKey = versionStr ? `version:${countryName}:${cityName}:${versionStr}` : null;

              // holy if spam
              if (!filterServers.index.has(cKey)) {
                filterServers.index.set(cKey, []);
              }
              if (!filterServers.index.has(cityKey)) {
                filterServers.index.set(cityKey, []);
              }
              if (vKey && !filterServers.index.has(vKey)) {
                filterServers.index.set(vKey, []);
              }
              if (cVKey && !filterServers.index.has(cVKey)) {
                filterServers.index.set(cVKey, []);
              }
              if (cityVKey && !filterServers.index.has(cityVKey)) {
                filterServers.index.set(cityVKey, []);
              }

              filterServers.index.get(cKey).push(s);
              filterServers.index.get(cityKey).push(s);
              if (vKey) {
                filterServers.index.get(vKey).push(s);
              }
              if (cVKey) {
                filterServers.index.get(cVKey).push(s);
              }
              if (cityVKey) {
                filterServers.index.get(cityVKey).push(s);
              }
            }
          }

          if (country && city && version) {
            return filterServers.index.get(`version:${country}:${city}:${version}`) || [];
          }
          if (country && city) {
            return filterServers.index.get(`city:${country}:${city}`) || [];
          }
          if (country && version) {
            return filterServers.index.get(`version:${country}:${version}`) || [];
          }
          if (version) {
            return filterServers.index.get(`version:${version}`) || [];
          }
          if (country) {
            return filterServers.index.get(`country:${country}`) || [];
          }

          return servers;
        }

        /*******************************************************
        name of function: updateServerCardThumbnails
        description: updates thumbnails for a specific server card after they're loaded
        *******************************************************/
        function updateServerCardThumbnails(serverId, playerThumbnails, maxPlayers, currentPlayers) {
            const serverCard = document.querySelector(`[data-server-id="${serverId}"]`);
            if (!serverCard) return;

            const thumbnailsContainer = serverCard.querySelector('.player-thumbnails-container');
            if (!thumbnailsContainer) return;

            // Clear existing content (mock thumbnails)
            thumbnailsContainer.innerHTML = '';

            // Add real player thumbnails
            const maxThumbnails = 5;
            const displayedThumbnails = playerThumbnails.slice(0, maxThumbnails);

            displayedThumbnails.forEach(thumb => {
                if (thumb && thumb.imageUrl) {
                    const img = document.createElement("img");
                    img.src = thumb.imageUrl;
                    img.className = "avatar-card-image";
                    img.style.width = "60px";
                    img.style.height = "60px";
                    img.style.borderRadius = "50%";
                    img.style.transition = "opacity 0.3s ease";
                    img.style.opacity = "0";
                    thumbnailsContainer.appendChild(img);

                    img.onload = () => {
                        img.style.opacity = "1";
                    };
                }
            });

            // Add placeholder for hidden players
            const hiddenPlayers = currentPlayers - displayedThumbnails.length;
            if (hiddenPlayers > 0) {
                const placeholder = document.createElement("div");
                placeholder.className = "avatar-card-image";
                placeholder.style.width = "60px";
                placeholder.style.height = "60px";
                placeholder.style.borderRadius = "50%";
                placeholder.style.backgroundColor = "#6a6f81";
                placeholder.style.display = "flex";
                placeholder.style.alignItems = "center";
                placeholder.style.justifyContent = "center";
                placeholder.style.color = "#fff";
                placeholder.style.fontSize = "14px";
                placeholder.textContent = `+${hiddenPlayers}`;
                thumbnailsContainer.appendChild(placeholder);
            }
        }

        /*******************************************************
        name of function: createThumbnailContainer
        description: Creates thumbnail container - now works for both real and mock thumbnails
        *******************************************************/
        function createThumbnailContainer(playerThumbnails, maxPlayers, currentPlayers, isMock = false) {
            const thumbnailsContainer = document.createElement("div");
            thumbnailsContainer.className = "player-thumbnails-container";
            thumbnailsContainer.style.display = "grid";
            thumbnailsContainer.style.gridTemplateColumns = "repeat(3, 60px)";
            thumbnailsContainer.style.gridTemplateRows = "repeat(2, 60px)";
            thumbnailsContainer.style.gap = "5px";
            thumbnailsContainer.style.marginBottom = "10px";

            // function for mock thumbnails
            const randomBase64Image = () => {
                const placeholders = [
                    window.Base64Images.roblox_avatar,
                    window.Base64Images.builderman_avatar,
                ];
                return placeholders[Math.floor(Math.random() * placeholders.length)];
            };

            const maxThumbnails = 5;
            const displayedCount = Math.min(currentPlayers, maxThumbnails);

            // Create thumbnails (mock or real)
            for (let i = 0; i < displayedCount; i++) {
                const img = document.createElement("img");

                if (isMock) {
                    img.src = randomBase64Image();
                } else if (playerThumbnails[i] && playerThumbnails[i].imageUrl) {
                    img.src = playerThumbnails[i].imageUrl;
                } else {
                    continue; // Skip if no thumbnail data
                }

                img.className = "avatar-card-image";
                img.style.width = "60px";
                img.style.height = "60px";
                img.style.borderRadius = "50%";
                img.style.opacity = "1";
                thumbnailsContainer.appendChild(img);
            }

            // add +x placeholder for hidden players
            const hiddenPlayers = currentPlayers - displayedCount;
            if (hiddenPlayers > 0) {
                const placeholder = document.createElement("div");
                placeholder.className = "avatar-card-image";
                placeholder.style.width = "60px";
                placeholder.style.height = "60px";
                placeholder.style.borderRadius = "50%";
                placeholder.style.backgroundColor = "#6a6f81";
                placeholder.style.display = "flex";
                placeholder.style.alignItems = "center";
                placeholder.style.justifyContent = "center";
                placeholder.style.color = "#fff";
                placeholder.style.fontSize = "14px";
                placeholder.textContent = `+${hiddenPlayers}`;
                thumbnailsContainer.appendChild(placeholder);
            }

            return thumbnailsContainer;
        }

        /*******************************************************
        name of function: getLatestPlaceVersion
        description: get the latest published version of a place
        *******************************************************/
        async function getLatestPlaceVersion(gameId) { // yea may get called 1 billion times
            try {
                const token = await getCsrfToken();
                if (!token) {
                    ConsoleLogEnabled("Error: Could not get CSRF token for version check");
                    return null;
                }

                return new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: "POST",
                        url: "https://develop.roblox.com/v1/assets/latest-versions",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRF-TOKEN": token
                        },
                        data: JSON.stringify({
                            assetIds: [parseInt(gameId)],
                            versionStatus: "Published"
                        }),
                        onload: function(response) {
                            try {
                                const data = JSON.parse(response.responseText);
                                if (data.results && data.results.length > 0 && data.results[0].status === "Success") {
                                    const versionNumber = data.results[0].versionNumber;
                                    ConsoleLogEnabled(`Latest Published Place Version: ${versionNumber}`);
                                    resolve(versionNumber);
                                } else {
                                    ConsoleLogEnabled("Error: Could not retrieve version number from response");
                                    resolve(null);
                                }
                            } catch (err) {
                                ConsoleLogEnabled("Error parsing latest version response:", err);
                                resolve(null);
                            }
                        },
                        onerror: function(err) {
                            ConsoleLogEnabled("Error fetching latest place version:", err);
                            resolve(null);
                        },
                        withCredentials: true
                    });
                });

            } catch (error) {
                ConsoleLogEnabled("Error fetching latest place version:", error);
                return null;
            }
        }

        /*******************************************************
        name of function: rebuildServerList
        description: function to create server cards immediately and load thumbnails
        *******************************************************/
        async function rebuildServerList(gameId, totalLimit, best_connection, quick_join = false) {
            const latestPublishedVersion = await getLatestPlaceVersion(gameId);
            const serverListContainer = document.getElementById("rbx-public-game-server-item-container");
            const isJoinMode = best_connection || quick_join;

            // If in any join mode (best connection or quick join)
            if (isJoinMode) {
                const originalInvert = localStorage.getItem('ROLOCATE_invertplayercount');
                let foundServer = false;

                try {
                    // only disable filter button for best_connection, not for quick_join
                    if (best_connection) {
                        disableFilterButton(true);
                    }
                    notifications("Retrieving Location...", "success", "🌎", '5000');
                    const userLocation = await getUserLocation(true);
                    const serverRegionsPrefs = JSON.parse(localStorage.getItem('ROLOCATE_serverRegions') || '{}');
                    if (!userLocation) {
                        notifications('Error: Unable to fetch your location. Please enable location access or set it to manual in settings.', 'error', '⚠️', '5000');
                        return;
                    }

                    for (let attempt = 0; attempt < 2 && !foundServer; attempt++) {
                        if (attempt === 0) {
                            if (originalInvert === 'true') {
                                localStorage.setItem('ROLOCATE_invertplayercount', 'false');
                            } // the fix
                        } else {
                            localStorage.setItem('ROLOCATE_invertplayercount', 'true');
                            notifications('No available servers found. Trying smallest servers...', 'info', '🔄', '3000');
                        }

                        const servers = await fetchPublicServers(gameId, 50);
                        if (servers.length === 0) {
                            notifications('No servers found for this game.', 'error', '⚠️', '3000');
                            continue;
                        }

                        const isFastServers = localStorage.getItem("ROLOCATE_fastservers") === "true";
                        let closestServer = null;
                        let minDistance = Infinity;
                        let closestServerLocation = null; // used for best connection (ik it says not used but its used)

                        if (isFastServers) {
                            const results = await Promise.allSettled(
                                servers.map(async server => {
                                    const {
                                        id: serverId,
                                        maxPlayers,
                                        playing
                                    } = server;
                                    if (playing >= maxPlayers) return null;

                                    try {
                                        const location = await fetchServerDetails(gameId, serverId);
                                        // respect banned server regions
                                        const regionKey = `${location.city}_${location.country?.code}`;
                                        if (serverRegionsPrefs[regionKey] === 'banned') {
                                            ConsoleLogEnabled(`Skipping server ${serverId} due to banned region ${regionKey}.`);
                                            return null;
                                        }
                                        const distance = calculateDistance(
                                            userLocation.latitude,
                                            userLocation.longitude,
                                            location.latitude,
                                            location.longitude
                                        );
                                        return {
                                            server,
                                            location,
                                            distance
                                        };
                                    } catch (error) {
                                        ConsoleLogEnabled(`Error fetching details for server ${serverId}:`, error);
                                        return null;
                                    }
                                })
                            );

                            for (const result of results) {
                                if (result.status === "fulfilled" && result.value) {
                                    const {
                                        server,
                                        location,
                                        distance
                                    } = result.value;
                                    if (distance < minDistance) {
                                        minDistance = distance;
                                        closestServer = server;
                                        closestServerLocation = location; // used for best connection
                                    }
                                }
                            }
                        } else {
                            for (const server of servers) {
                                const {
                                    id: serverId,
                                    maxPlayers,
                                    playing
                                } = server;
                                if (playing >= maxPlayers) continue;

                                    try {
                                        const location = await fetchServerDetails(gameId, serverId);
                                        // respect banned regions
                                        const regionKey = `${location.city}_${location.country?.code}`;
                                        if (serverRegionsPrefs[regionKey] === 'banned') {
                                            ConsoleLogEnabled(`Skipping server ${serverId} due to banned region ${regionKey}.`);
                                            continue;
                                        }
                                        const distance = calculateDistance(
                                            userLocation.latitude,
                                            userLocation.longitude,
                                            location.latitude,
                                            location.longitude
                                        );

                                        if (distance < minDistance) {
                                            minDistance = distance;
                                            closestServer = server;
                                            closestServerLocation = location; // used for best connection
                                        }
                                    } catch (error) {
                                        ConsoleLogEnabled(`Error fetching details for server ${serverId}:`, error);
                                        continue;
                                    }
                            }
                        }

                        if (closestServer) {
                            JoinServer(gameId, closestServer.id);
                            notifications(`Joining nearest server! \nDistance: ${Math.round(minDistance / 1.609)} miles | ${Math.round(minDistance)} km`, 'success', '🚀', '5000');
                            foundServer = true;
                        }
                    }

                    if (!foundServer) {
                        notifications('No valid servers found. This game might be popular right now. Try using \'Server Region\' or refresh the page and try again later.', 'error', '⚠️', '8000');
                        notifications('Or no unbanned servers found. Try to enable more regions in settings!', 'error', '⚠️', '8000');
                    }
                } catch (error) {
                    ConsoleLogEnabled("Error in join mode:", error);
                    notifications('Error during server search: ' + error.message, 'error', '⚠️', '5000');
                } finally {
                    if (originalInvert !== null) {
                        localStorage.setItem('ROLOCATE_invertplayercount', originalInvert);
                    } else {
                        localStorage.setItem('ROLOCATE_invertplayercount', 'false');
                    }
                    if (best_connection) {
                        disableFilterButton(false);
                    }
                    Loadingbar(false);
                }
                return;
            }

            // Rest of the function for normal server list display
            if (!serverListContainer) {
                ConsoleLogEnabled("Server list container not found!");
                notifications('Error: No Servers found. There is nobody playing this game. Please refresh the page.', 'error', '⚠️', '8000');
                Loadingbar(false);
                return;
            }

            const messageElement = showMessage("Just a moment — to detect your location accurately, please stay on this page...");
            const premium_message = messageElement.querySelector('.premium-message-text');

            try {
                // Retrieve user's location for distance calculations
                const userLocation = await getUserLocation();
                if (!userLocation) {
                    notifications('Error: Unable to fetch your location. Please enable location access.', 'error', '⚠️', '5000');
                    disableFilterButton(false);
                    return;
                }

                // update message after location is retrieved
                if (premium_message) {
                    premium_message.textContent = "Location detected! Discovering servers...";
                }

                // thx Waivy
                let servers = await fetchPublicServers(gameId, totalLimit);

                if (servers.length === 0) {
                    ConsoleLogEnabled("No servers returned on first attempt, Retrying after delay");
                    if (premium_message) {
                        premium_message.textContent = "Waiting for server data to load";
                    }

                    const retrycap = 3;
                    for (let retry = 1; retry <= retrycap && servers.length === 0; retry++) {
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        if (premium_message) {
                            premium_message.textContent = `Retrying server fetch (attempt ${retry}/${retrycap})`;
                        }
                        ConsoleLogEnabled(`Retry attempt ${retry}/${retrycap}...`);
                        servers = await fetchPublicServers(gameId, totalLimit);
                    }
                }

                const totalServers = servers.length;
                let skippedServers = 0;

                if (totalServers === 0) {
                    if (premium_message) {
                        premium_message.textContent = "No servers found. The game may not have active public servers right now or is a solo game. Try refreshing the page.";
                    }
                    notifications('No servers found. The game may not have active public servers right now or is a solo game. Try refreshing the page.', 'error', '⚠️', '5000');
                    Loadingbar(false);
                    disableFilterButton(false);
                    return;
                }

                if (premium_message) {
                    premium_message.textContent = `Filtering servers... Please stay on this page to ensure a faster and more accurate search. ${totalServers} servers found, 0 loaded so far.`;
                }

                notifications(`Please do not leave this page as it slows down the search. \nFound a total of ${totalServers} servers.`, 'success', '👍', '3000');
                notifications(`As of April 2026, Roblox has significantly restricted how server regions are discovered, limiting results to only 10 servers per second. Sorry!`, 'warning', ' 😢 ', '10000');

                let serverDetails = [];
                const thumbnailCache = new Map(); // cache for thumbnails
                const useBatching = localStorage.ROLOCATE_fastservers === "true";

                // process servers to get location data (WITHOUT waiting for thumbnails)
                if (useBatching) {
                    const batchSize = 10;
                    let processedCount = 0;

                    for (let i = 0; i < servers.length; i += batchSize) {
                        const batch = servers.slice(i, i + batchSize);
                        const batchPromises = batch.map(async (server) => {
                            const {
                                id: serverId,
                                maxPlayers,
                                playing
                            } = server;

                            if (playing >= maxPlayers) {
                                skippedServers++;
                                return null;
                            }

                            try {
                                const location = await fetchServerDetails(gameId, serverId);

                                if (location.city === "Unknown") {
                                    ConsoleLogEnabled(`Skipping server ${serverId} because location is unknown.`);
                                    skippedServers++;
                                    return null;
                                }

                                return {
                                    server,
                                    location
                                };
                            } catch (error) {
                                if (error === 'purchase_required') {
                                    throw error;
                                } else if (error === 'subplace_join_restriction') {
                                    throw error;
                                } else if (error === 'banned_by_creator') {
                                    throw error;
                                } else {
                                    ConsoleLogEnabled(error);
                                    skippedServers++;
                                    return null;
                                }
                            }
                        });

                        const batchResults = await Promise.all(batchPromises);
                        const previousProcessedCount = processedCount;
                        const validResults = batchResults.filter(result => result !== null);
                        serverDetails.push(...validResults);
                        processedCount += batch.length;

                        // smoothly update the processed count
                        function updateProcessedCountSmoothly(startCount, targetCount) {
                            const increment = 1;
                            let currentCount = startCount;

                            const interval = setInterval(() => {
                                if (currentCount < targetCount) {
                                    currentCount += increment;
                                    if (premium_message) {
                                        premium_message.textContent = `Filtering servers, please do not leave this page...\n${totalServers} servers found, ${currentCount} server locations found`;
                                    }
                                } else {
                                    clearInterval(interval);
                                }
                            }, 90);
                        }

                        updateProcessedCountSmoothly(previousProcessedCount, processedCount);
                    }
                } else {
                    // sequential processing
                    for (let i = 0; i < servers.length; i++) {
                        const server = servers[i];
                        const {
                            id: serverId,
                            maxPlayers,
                            playing
                        } = server;

                        let location;
                        try {
                            location = await fetchServerDetails(gameId, serverId);
                        } catch (error) {
                            if (error === 'purchase_required') {
                                if (premium_message) {
                                    premium_message.textContent = "Error: Cannot access server regions because you have not purchased the game.";
                                }
                                notifications('Error: Cannot access server regions because you have not purchased the game.', 'error', '⚠️', '15000');
                                Loadingbar(false);
                                return;
                            } else if (error === 'subplace_join_restriction') {
                                if (premium_message) {
                                    premium_message.textContent = "Error: This game requires users to teleport to a subplace. As a result, server regions cannot be retrieved.";
                                }
                                notifications('Error: This game requires users to teleport to a subplace. As a result, server regions cannot be retrieved.', 'error', '⚠️', '15000');
                                Loadingbar(false);
                                return;
                            } else if (error === 'banned_by_creator') {
                                if (premium_message) {
                                    premium_message.textContent = "Error: Cannot access server regions because the creator has banned you from the game.";
                                }
                                notifications('Error: Cannot access server regions because the creator has banned you from the game.', 'error', '⚠️', '15000');
                                Loadingbar(false);
                                return;
                            } else {
                                ConsoleLogEnabled(error);
                                location = {
                                    city: "Unknown",
                                    country: {
                                        name: "Unknown",
                                        code: "??"
                                    }
                                };
                            }
                        }

                        if (location.city === "Unknown" || playing >= maxPlayers) {
                            ConsoleLogEnabled(`Skipping server ${serverId} because it is full or location is unknown.`);
                            skippedServers++;
                            continue;
                        }

                        serverDetails.push({
                            server,
                            location
                        });

                        if (premium_message) {
                            premium_message.textContent = `Filtering servers, please do not leave this page...\n${totalServers} servers found, ${i + 1} server locations found`;
                        }
                    }
                }

                // filter out servers from banned regions
                try {
                    const serverRegionsPrefs = JSON.parse(localStorage.getItem('ROLOCATE_serverRegions') || '{}');
                    const beforeFilterCount = serverDetails.length;
                    const allowed = serverDetails.filter(d => {
                        const key = `${d.location.city}_${d.location.country?.code}`;
                        return serverRegionsPrefs[key] !== 'banned';
                    });
                    const bannedExcluded = beforeFilterCount - allowed.length;
                    if (bannedExcluded > 0) {
                        skippedServers += bannedExcluded;
                        notifications(`${bannedExcluded} servers excluded due to banned regions.`, 'info', '🌍', '3000');
                    }
                    serverDetails = allowed;
                } catch (e) {
                    ConsoleLogEnabled('Error parsing server region preferences:', e);
                }

                if (serverDetails.length === 0) {
                    showMessage("END");
                    if (servers.every(s => s.maxPlayers === 1)) {
                        notifications('All servers have a max player count of 1. These are likely solo servers and cannot be joined normally.', 'error', '⚠️', '8000');
                    } else {
                    notifications('No servers were found. Possible reasons include: full servers, no servers in your enabled regions, or a temporary glitch. Try adjusting your settings or searching again with lowest player count.', 'error', '⚠️', '25000');
                    }
                    Loadingbar(false);
                    return;
                }

                const loadedServers = totalServers - skippedServers;
                notifications(`Filtering complete!\n${totalServers} servers found, ${loadedServers} servers loaded, ${skippedServers} servers skipped (full) or were banned by user.`, 'success', '👍', '5000');

                // Check script handler notifications
                if (typeof GM_info !== 'undefined') {
                    const handler = GM_info.scriptHandler?.toLowerCase();
                    const fastServers = localStorage.getItem('ROLOCATE_fastservers');

                    if (handler?.includes('violentmonkey') && fastServers === 'false') {
                        notifications(`You're using Violentmonkey, it supports Fast Servers. Turn on "Fast Server Search" in Settings → General → Fast Server Search, to search servers up to 100x faster!`, 'info', '🚀', '12000');
                    }

                    if (handler?.includes('scriptcat') && fastServers === 'false') {
                        notifications(`You're using ScriptCat, it supports Fast Servers. Turn on "Fast Server Search" in Settings → General → Fast Server Search, to search servers up to 100x faster!`, 'info', '🚀', '12000');
                    }

                    if (handler?.includes('tampermonkey')) {
                        notifications(`Server search is slow because of a bug in Tampermonkey. Use Violentmonkey or Scriptcat to make it 100x faster!`, 'info', '🚀', '12000');
                    }
                }

                showMessage("END");
                Loadingbar(false);

                // Add filter dropdowns
                const filterContainer = createFilterDropdowns(serverDetails);
                serverListContainer.parentNode.insertBefore(filterContainer, serverListContainer);

                // Style the server list container
                serverListContainer.style.display = "grid";
                serverListContainer.style.gridTemplateColumns = "repeat(4, 1fr)";
                serverListContainer.style.gap = "0px";

                // compacted code to save some space. still readable tho. for server version labels (New) and (Old)
                const serverVersions = serverDetails.map(d => d.location.placeVersion).filter(v => v != null && v !== 'N/A').map(Number);
                const minVersion = serverVersions.length > 0 ? Math.min(...serverVersions) : null;
                const maxVersion = serverVersions.length > 0 ? Math.max(...serverVersions) : null;

                const displayFilteredServers = (country, city, version) => {
                    serverListContainer.innerHTML = "";

                    const filteredServers = filterServers(serverDetails, country, city, version);
                    const sortedServers = filteredServers.sort((a, b) => {
                        const distanceA = calculateDistance(userLocation.latitude, userLocation.longitude, a.location.latitude, a.location.longitude);
                        const distanceB = calculateDistance(userLocation.latitude, userLocation.longitude, b.location.latitude, b.location.longitude);
                        return distanceA - distanceB;
                    });

                    //create server cards immediately
                    sortedServers.forEach(({
                        server,
                        location
                    }) => {
                        const serverCard = document.createElement("li");
                        serverCard.className = "rbx-game-server-item col-md-3 col-sm-4 col-xs-6";
                        serverCard.style.width = "100%";
                        serverCard.style.minHeight = "400px";
                        serverCard.style.display = "flex";
                        serverCard.style.flexDirection = "column";
                        serverCard.style.justifyContent = "space-between";
                        serverCard.style.boxSizing = "border-box";
                        serverCard.style.outline = 'none';

                        serverCard.setAttribute('data-server-id', server.id);

                        // Create ping label
                        const pingLabel = document.createElement("div");
                        pingLabel.style.marginBottom = "8px";
                        pingLabel.style.padding = "8px 12px";
                        pingLabel.style.borderRadius = "8px";
                        pingLabel.style.fontWeight = "bold";
                        pingLabel.style.textAlign = "center";
                        pingLabel.style.fontSize = "13px !important";
                        pingLabel.style.textTransform = "uppercase !important";
                        pingLabel.style.letterSpacing = "0.5px !important";

                        // calculate distance and ping
                        const distance = calculateDistance(
                            userLocation.latitude,
                            userLocation.longitude,
                            location.latitude,
                            location.longitude
                        );

                        // formula derived from regression of 382 data points. restricted domain of distance >= 0
                        // distance is km
                        const calculatedPing = 2.05816 * Math.sqrt((1/0.700042) * (Math.max(distance,0) + 2479.47383)) - 72.29266;


                        if (Math.max(distance, 0) < 1250) {
                            pingLabel.textContent = "⚡ Fast";
                            pingLabel.style.backgroundColor = "#1a4a3a";
                            pingLabel.style.color = "#4ade80";
                            pingLabel.style.border = "1px solid #22c55e";
                        } else if (Math.max(distance, 0) < 5000) {
                            pingLabel.textContent = "⏳ OK";
                            pingLabel.style.backgroundColor = "#4a3a1a";
                            pingLabel.style.color = "#fbbf24";
                            pingLabel.style.border = "1px solid #f59e0b";
                        } else {
                            pingLabel.textContent = "🐌 Slow";
                            pingLabel.style.backgroundColor = "#4a1a1a";
                            pingLabel.style.color = "#f87171";
                            pingLabel.style.border = "1px solid #ef4444";
                        }

                        // create thumbnails
                        let thumbnailsContainer;
                        const cachedThumbnails = thumbnailCache.get(server.id);
                        if (cachedThumbnails && cachedThumbnails !== 'loading') {
                            thumbnailsContainer = createThumbnailContainer(cachedThumbnails, server.maxPlayers, server.playing, false);
                        } else {
                            thumbnailsContainer = createThumbnailContainer(null, server.maxPlayers, server.playing, true);
                        }

                        // calculate server health
                        const healthPercentage = Math.min(100, Math.round((server.fps / 60) * 100));
                        let healthBg, healthIcon;
                        if (healthPercentage >= 90) {
                            healthBg = '#1a4a3a';
                            healthIcon = '🟢';
                        } else if (healthPercentage >= 80) {
                            healthBg = '#4a3a1a';
                            healthIcon = '🟡';
                        } else if (healthPercentage >= 70) {
                            healthBg = '#4a2a1a';
                            healthIcon = '🟠';
                        } else {
                            healthBg = '#4a1a1a'; // yea bad server
                            healthIcon = '🔴';
                        }

                        const cardItem = document.createElement("div");
                        cardItem.className = "card-item";
                        cardItem.style.display = "flex";
                        cardItem.style.flexDirection = "column";
                        cardItem.style.justifyContent = "space-between";
                        cardItem.style.height = "100%";
                        cardItem.style.color = "#e5e5e5";

                        const versionDisplay = location.placeVersion && location.placeVersion !== 'N/A'
                            ? (location.placeVersion === latestPublishedVersion
                                ? `${location.placeVersion} <span style="display: inline-block; background: rgba(34, 197, 94, 0.12); color: #22c55e; font-weight: 600; font-size: 10px; padding: 3px 10px; border-radius: 6px; margin-left: 8px; text-transform: uppercase; letter-spacing: 0.8px; border: 1px solid rgba(34, 197, 94, 0.25);">NEW</span>`
                                : location.placeVersion === minVersion
                                    ? `${location.placeVersion} <span style="display: inline-block; background: rgba(239, 68, 68, 0.12); color: #ef4444; font-weight: 600; font-size: 10px; padding: 3px 10px; border-radius: 6px; margin-left: 8px; text-transform: uppercase; letter-spacing: 0.8px; border: 1px solid rgba(239, 68, 68, 0.25);">OLD</span>`
                                    : location.placeVersion)
                            : 'N/A';

                        cardItem.innerHTML = `
                        ${thumbnailsContainer.outerHTML}
                        <div class="rbx-game-server-details game-server-details" style="margin-top: 12px;">
                            <div class="text-info rbx-game-status rbx-game-server-status text-overflow" style="color: #b3b3b3; font-size: 16px; margin-bottom: 8px; text-align: center;">
                                ${server.playing} of ${server.maxPlayers} people max
                            </div>
                            <div class="server-player-count-gauge border" style="background: #1a1a1a; border: 1px solid #404040; border-radius: 6px; height: 8px; overflow: hidden; margin-bottom: 12px;">
                                <div class="gauge-inner-bar border" style="background: linear-gradient(90deg, #bcbec8, #bcbec8); height: 100%; border: none; transition: width 0.3s ease; width: ${(server.playing / server.maxPlayers) * 100}%;"></div>
                            </div>
                            <span data-placeid="${gameId}">
                                <button type="button" class="btn-full-width btn-control-xs rbx-game-server-join game-server-join-btn btn-primary-md btn-min-width" style="background: #404040; border: 1px solid #555555; color: #e5e5e5; border-radius: 8px; padding: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; width: 100%; text-transform: uppercase; letter-spacing: 0.5px; font-size: 12px;">Join</button>
                            </span>
                        </div>
                            <div style="margin-top: 12px; text-align: center; color: #b3b3b3;">
                                ${pingLabel.outerHTML}
                                <div style="margin-top: 10px; background: #1f1f1f; border-radius: 8px; padding: 12px; border: 1px solid #333333;">
                                    <div style="margin-bottom: 6px; font-size: 14px; color: #888888;">
                                        <span style="color: #e5e5e5; font-weight: 600;">Estimated Ping:</span> ${calculatedPing.toFixed(1)}ms
                                    </div>
                                    <hr style="margin: 6px 0; border: none; height: 1px; background: #333333;">
                                    <div style="margin-bottom: 6px; font-size: 14px; color: #888888;">
                                        <span style="color: #e5e5e5; font-weight: 600;">Distance:</span> ${distance.toFixed(1)}km
                                    </div>
                                    <hr style="margin: 6px 0; border: none; height: 1px; background: #333333;">
                                    <div style="margin-bottom: 6px; font-size: 14px; color: #888888;">
                                        <span style="color: #e5e5e5; font-weight: 600;">Location:</span> ${location.city}, ${location.country.name}
                                    </div>
                                    <hr style="margin: 6px 0; border: none; height: 1px; background: #333333;">
                                    <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                                        <span style="color: #e5e5e5; font-weight: 600; font-size: 14px;">Server Health:</span>
                                        <div style="display: flex; align-items: center; gap: 4px; background: ${healthBg}; padding: 3px 8px; border-radius: 6px;">
                                            <span style="font-size: 12px;">${healthIcon}</span>
                                            <span style="font-weight: 700; font-size: 13px;">${healthPercentage}%</span>
                                        </div>
                                    </div>
                                    <hr style="margin: 6px 0; border: none; height: 1px; background: #333333;">
                                    <div style="margin-bottom: 6px; font-size: 14px; color: #888888;">
                                            <span style="color: #e5e5e5; font-weight: 600;">Version:</span> ${versionDisplay}
                                    </div>
                                </div>
                            </div>
                        </div>
                        `;

                        const joinButton = cardItem.querySelector(".rbx-game-server-join");
                        joinButton.addEventListener('mouseenter', () => {
                            joinButton.style.background = '#4a4a4a';
                            joinButton.style.borderColor = '#666666';
                            joinButton.style.transform = 'translateY(-1px)';
                        });
                        joinButton.addEventListener('mouseleave', () => {
                            joinButton.style.background = '#404040';
                            joinButton.style.borderColor = '#555555';
                            joinButton.style.transform = 'translateY(0)';
                        });

                        joinButton.addEventListener("click", () => {
                            ConsoleLogEnabled(`Roblox.GameLauncher.joinGameInstance(${gameId}, "${server.id}")`); // not anymore
                            JoinServer(gameId, server.id);
                        });

                        const container = adjustJoinButtonContainer(joinButton);
                        const inviteButton = createInviteButton(gameId, server.id);

                        inviteButton.style.background = '#404040';
                        inviteButton.style.border = '1px solid #555555';
                        inviteButton.style.color = '#e5e5e5';
                        inviteButton.style.borderRadius = '8px';
                        inviteButton.style.fontWeight = '600';
                        inviteButton.style.transition = 'all 0.2s ease';
                        inviteButton.style.textTransform = 'uppercase';
                        inviteButton.style.letterSpacing = '0.5px';
                        inviteButton.style.fontSize = '12px';

                        inviteButton.addEventListener('mouseenter', () => {
                            inviteButton.style.background = '#4a4a4a';
                            inviteButton.style.borderColor = '#666666';
                            inviteButton.style.transform = 'translateY(-1px)';
                        });
                        inviteButton.addEventListener('mouseleave', () => {
                            inviteButton.style.background = '#404040';
                            inviteButton.style.borderColor = '#555555';
                            inviteButton.style.transform = 'translateY(0)';
                        });

                        container.appendChild(inviteButton);

                        serverCard.appendChild(cardItem);
                        serverListContainer.appendChild(serverCard);

                      // load real thumbnails in background if not cached and not already being fetched
                      // added another condition so that finding thumbnails only occurs if mobilemode = false. This is a performance upgrade for mobile users.
                      if (server.playerTokens && server.playerTokens.length > 0 && !thumbnailCache.has(server.id) && localStorage.ROLOCATE_mobilemode === "false") {
                          // mark as being fetched to prevent duplicate requests
                          thumbnailCache.set(server.id, 'loading');
                          fetchPlayerThumbnails(server.playerTokens)
                              .then(thumbnails => {
                                  thumbnailCache.set(server.id, thumbnails);
                                  updateServerCardThumbnails(server.id, thumbnails, server.maxPlayers, server.playing);
                              })
                              .catch(error => {
                                  ConsoleLogEnabled(`Failed to load thumbnails for server ${server.id}:`, error);
                                  // remove the 'loading' marker on error so it can be retried
                                  thumbnailCache.delete(server.id);
                          });
                      }
                    });
                };

                // Add event listeners to dropdowns
                const countryFilter = document.getElementById('countryFilter');
                const cityFilter = document.getElementById('cityFilter');
                const versionFilter = document.getElementById('versionFilter');

                countryFilter.addEventListener('change', () => {
                    displayFilteredServers(countryFilter.value, cityFilter.value, versionFilter.value);
                });

                cityFilter.addEventListener('change', () => {
                    displayFilteredServers(countryFilter.value, cityFilter.value, versionFilter.value);
                });

                versionFilter.addEventListener('change', () => {
                    displayFilteredServers(countryFilter.value, cityFilter.value, versionFilter.value);
                });

                // countries cities and versions
                displayFilteredServers("", "", "");

            } catch (error) {
                if (error === 'purchase_required') {
                    if (premium_message) {
                        premium_message.textContent = "Error: Cannot access server regions because you have not purchased the game.";
                    }
                    notifications('Error: Cannot access server regions because you have not purchased the game.', 'error', '⚠️', '15000');
                    Loadingbar(false);
                    return;
                } else if (error === 'subplace_join_restriction') {
                    if (premium_message) {
                        premium_message.textContent = "Error: This game requires users to teleport to a subplace. As a result, server regions cannot be retrieved.";
                    }
                    notifications('Error: This game requires users to teleport to a subplace. As a result, server regions cannot be retrieved.', 'error', '⚠️', '15000');
                    Loadingbar(false);
                    return;
                } else if (error === 'banned_by_creator') {
                    if (premium_message) {
                        premium_message.textContent = "Error: Cannot access server regions because the creator has banned you from the game.";
                    }
                    notifications('Error: Cannot access server regions because the creator has banned you from the game.', 'error', '⚠️', '15000');
                    Loadingbar(false);
                    return;
                } else {
                    ConsoleLogEnabled("Error rebuilding server list:", error);
                    notifications('Filtering Error: Failed to obtain permission to send API requests to the Roblox API. Please allow the script to enable request sending.', 'error', '⚠️ ', '8000');
                    if (premium_message) {
                        premium_message.textContent = "Filtering Error: Failed to obtain permission to send API requests to the Roblox API. Please allow the script to enable request sending.";
                    }
                    Loadingbar(false);
                }
            } finally {
                Loadingbar(false);
                disableFilterButton(false);
            }
        }

        // script breaks if i remove this so its staying
        const gameId = getCurrentGameId();
        /*******************************************************
        name of function: createInviteButton
        description: Creates the invite button (server region)
        *******************************************************/
        function createInviteButton(placeId, serverId) {
            const inviteButton = document.createElement('button');
            inviteButton.textContent = 'Invite';
            inviteButton.className = 'btn-control-xs btn-primary-md btn-min-width btn-full-width';
            inviteButton.style.width = '25%';
            inviteButton.style.marginLeft = '5px';

            inviteButton.style.padding = '4px 8px';
            inviteButton.style.fontSize = '12px';
            inviteButton.style.borderRadius = '8px';
            inviteButton.style.backgroundColor = '#3b3e49';
            inviteButton.style.borderColor = '#3b3e49';
            inviteButton.style.color = '#ffffff';
            inviteButton.style.cursor = 'pointer';
            inviteButton.style.fontWeight = '500';
            inviteButton.style.textAlign = 'center';
            inviteButton.style.whiteSpace = 'nowrap';
            inviteButton.style.verticalAlign = 'middle';
            inviteButton.style.lineHeight = '100%';
            inviteButton.style.fontFamily = 'Builder Sans, Helvetica Neue, Helvetica, Arial, Lucida Grande, sans-serif';
            inviteButton.style.textRendering = 'auto';
            inviteButton.style.webkitFontSmoothing = 'antialiased';
            inviteButton.style.mozOsxFontSmoothing = 'grayscale';

            let resetTextTimeout = null;

            inviteButton.addEventListener('click', () => {
                const inviteLink = `https://oqarshi.github.io/Invite/?placeid=${placeId}&serverid=${serverId}`;
                navigator.clipboard.writeText(inviteLink).then(() => {
                    ConsoleLogEnabled(`Invite link copied to clipboard: ${inviteLink}`);
                    notifications('Success! Invite link copied to clipboard!', 'success', '🎉', '2000');

                    // no spam clicks
                    inviteButton.disabled = true;
                    inviteButton.style.opacity = '0.6';
                    inviteButton.style.cursor = 'not-allowed';

                    // reset the timeout
                    if (resetTextTimeout !== null) {
                        clearTimeout(resetTextTimeout);
                    }

                    inviteButton.textContent = 'Copied!';
                    resetTextTimeout = setTimeout(() => {
                        inviteButton.textContent = 'Invite';
                        inviteButton.disabled = false;
                        inviteButton.style.opacity = '1';
                        inviteButton.style.cursor = 'pointer';
                        resetTextTimeout = null;
                    }, 1000);
                }).catch(() => {
                    ConsoleLogEnabled('Failed to copy invite link.');
                    notifications('Error: Failed to copy invite link', 'error', '😔', '2000');
                });
            });

            return inviteButton;
        }


        /*******************************************************
        name of function: adjustJoinButtonContainer
        description: Function to adjust the Join button and its container
                     but it fails lmao and does 50/50 instead of 75/25
        *******************************************************/
        function adjustJoinButtonContainer(joinButton) {
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.width = '100%';

            joinButton.style.width = '75%';

            joinButton.parentNode.insertBefore(container, joinButton);
            container.appendChild(joinButton);

            return container;
        }




        /*********************************************************************************************************************************************************************************************************************************************
                                                                 Functions for the 6th button.

        *********************************************************************************************************************************************************************************************************************************************/


        /*******************************************************
        name of function: calculateDistance
        description: finds the distance between two points on a sphere (Earth)
        *******************************************************/

        function calculateDistance(lat1, lon1, lat2, lon2) {
            const R = 6371; // radius of the Earth in kilometers as a perfect sphere but obv its not a perfect sphere but close enough
            const dLat = (lat2 - lat1) * (Math.PI / 180);
            const dLon = (lon2 - lon1) * (Math.PI / 180);
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c; // distance in kilometers
        }


        /*******************************************************
        name of function: resolveOfflineFallbackLocation
        description: estimate user location if user declines
        *******************************************************/
        // fallback location resolver with timezone-based estimation
        function resolveOfflineFallbackLocation(resolve) {
            ConsoleLogEnabled("Attempting offline location estimation...");

            let guessedLocation = null;
            let closestLocation = null;
            let closestDistance = Infinity;

            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
            const timezoneMap = {
              "America/Los_Angeles": { lat: 34.0522, lon: -118.2437 },
              "America/Denver": { lat: 39.7392, lon: -104.9903 },
              "America/Chicago": { lat: 41.8781, lon: -87.6298 },
              "America/New_York": { lat: 40.7128, lon: -74.006 },
              "Europe/London": { lat: 51.5074, lon: -0.1278 },
              "Europe/Berlin": { lat: 52.52, lon: 13.405 },
              "Europe/Paris": { lat: 48.8566, lon: 2.3522 },
              "Asia/Tokyo": { lat: 35.6895, lon: 139.6917 },
              "Asia/Kolkata": { lat: 28.6139, lon: 77.209 },
              "Australia/Sydney": { lat: -33.8688, lon: 151.2093 },
              "America/Argentina/Buenos_Aires": { lat: -34.6037, lon: -58.3816 },
              "Africa/Nairobi": { lat: -1.286389, lon: 36.817223 },
              "Asia/Singapore": { lat: 1.3521, lon: 103.8198 },
              "America/Toronto": { lat: 43.65107, lon: -79.347015 },
              "Europe/Moscow": { lat: 55.7558, lon: 37.6173 },
              "Europe/Madrid": { lat: 40.4168, lon: -3.7038 },
              "Asia/Shanghai": { lat: 31.2304, lon: 121.4737 },
              "Africa/Cairo": { lat: 30.0444, lon: 31.2357 },
              "Africa/Johannesburg": { lat: -26.2041, lon: 28.0473 },
              "Europe/Amsterdam": { lat: 52.3676, lon: 4.9041 },
              "Asia/Manila": { lat: 14.5995, lon: 120.9842 },
              "Asia/Seoul": { lat: 37.5665, lon: 126.978 }
            };


            // check if user's timezone in map
            if (timezoneMap[timezone]) {
                guessedLocation = timezoneMap[timezone];
                ConsoleLogEnabled("User's timezone found:", timezone);
            }

            // if no timezone find closest one
            if (!guessedLocation) {
                ConsoleLogEnabled("User's timezone not found. Finding closest match...");
                Object.keys(timezoneMap).forEach((tz) => {
                    const location = timezoneMap[tz];
                    const distance = calculateDistance(location.lat, location.lon, 0, 0); // distance from equator
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestLocation = location;
                    }
                });
                guessedLocation = closestLocation;
            }

            //if location then good, if not then newyork
            if (guessedLocation) {
                notifications("Estimated location based on timezone. Please allow location access to see what servers are closest to you or change to manual in settings.", "info", "🕒", "6000");
                resolve({
                    latitude: guessedLocation.lat,
                    longitude: guessedLocation.lon
                });
            } else {
                notifications("Error: Could not estimate location. Fatal error, please report on Greasyfork. Using default (New York).", "error", "⚠️", "6000");
                resolve({
                    latitude: 40.7128,
                    longitude: -74.0060
                }); // nyc
            }
        }


        /*******************************************************
        name of function: getUserLocation
        description: gets the user's location
        @param {boolean} [quickJoin=false] – when true, operates in lightweight "quick join" mode
        *******************************************************/
        function getUserLocation(quickJoin = false) {
            return new Promise((resolve, reject) => {
                // check priority location setting
                const priorityLocation = localStorage.getItem("ROLOCATE_prioritylocation") || "automatic";

                // if in manual mode, use stored coordinates
                if (priorityLocation === "manual") {
                    try {
                        const coords = JSON.parse(GM_getValue("ROLOCATE_coordinates", '{"lat":"","lng":""}'));
                        if (coords.lat && coords.lng) {
                            ConsoleLogEnabled("Using manual location from storage");
                            notifications("We successfully detected your location.", "success", "🌎", "2000");
                            return resolve({
                                latitude: parseFloat(coords.lat), // changed to match automatic mode
                                longitude: parseFloat(coords.lng), // changed to match automatic mode
                                source: "manual",
                                accuracy: 0 // manual coordinates have no accuracy metric
                            });
                        } else {
                            ConsoleLogEnabled("Manual mode selected but no coordinates set - falling back to automatic behavior");
                            notifications("Manual mode selected but no coordinates set. Fatal error: Report on greasyfork. Using Automatic Mode.", "error", "", "2000");
                            // fall through to automatic behavior
                        }
                    } catch (e) {
                        ConsoleLogEnabled("Error reading manual coordinates:", e);
                        notifications("Error reading manual coordinates. Fatal error: Report on greasyfork. Using Automatic Mode.", "error", "", "2000");
                        // fall through to automatic behavior
                    }
                }

                // automatic mode behavior
                if (!navigator.geolocation) {
                    ConsoleLogEnabled("Geolocation not supported.");
                    notifications("Geolocation is not supported by your browser.", "error", "⚠️", "15000");
                    return resolveOfflineFallbackLocation(resolve);
                }

                // notify the user if location detection is taking too long
                const slowTimer = setTimeout(() => {
                    notifications("Location detection is slow. Consider setting your location manually in Settings > Advanced > Set Default Location Mode, to make server search almost instant.", "info", "⚙️", "12000");
                }, 3000);

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        clearTimeout(slowTimer);
                        resolveSuccess(position, resolve, quickJoin);
                    },
                    async (error) => {
                        ConsoleLogEnabled("Geolocation error:", error);
                        // slow timer
                        clearTimeout(slowTimer);
                        // attempt to inspect geolocation permission state
                        try {
                            if (navigator.permissions && navigator.permissions.query) {
                                const permissionStatus = await navigator.permissions.query({
                                    name: "geolocation"
                                });
                                ConsoleLogEnabled("Geolocation permission status:", permissionStatus.state);

                                if (permissionStatus.state === "denied") {
                                    return resolveOfflineFallbackLocation(resolve);
                                }
                            }
                        } catch (permError) {
                            ConsoleLogEnabled("Permission check failed:", permError);
                        }

                        // retry geolocation once
                        navigator.geolocation.getCurrentPosition(
                            (position) => resolveSuccess(position, resolve, quickJoin),
                            (retryError) => {
                                ConsoleLogEnabled("Second geolocation attempt failed:", retryError);
                                notifications("Could not get your location. Using fallback.", "error", "⚠️", "15000");
                                resolveOfflineFallbackLocation(resolve);
                            }, {
                                maximumAge: 5000,
                                timeout: 10000,
                            }
                        );
                    }, {
                        timeout: 10000,
                        maximumAge: 0,
                    }
                );
            });
        }

        /*******************************************************
        name of function: resolveSuccess
        description: tells the user that location was detected
        @param {GeolocationPosition} position – browser geolocation position
        @param {Function} resolve – promise resolver
        @param {boolean} [quickJoin=false] – when true, skips UI-disabling side‑effects
        *******************************************************/
        function resolveSuccess(position, resolve, quickJoin = false) {
            notifications("We successfully detected your location.", "success", "🌎", "2000");
            if (!quickJoin) {
                disableLoadMoreButton(true);
                disableFilterButton(true);
                Loadingbar(true);
            }
            resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                source: "geolocation",
                accuracy: position.coords.accuracy
            });
        }



        /*********************************************************************************************************************************************************************************************************************************************
                                                                 Functions for the 7th button.

        *********************************************************************************************************************************************************************************************************************************************/
        /*******************************************************
        name of function: auto_join_small_server
        description: Automatically joins the smallest server
        *******************************************************/
        async function auto_join_small_server() {
            // disable the "Load More" button and show the loading bar
            Loadingbar(true);
            disableFilterButton(true);
            disableLoadMoreButton();

            // get the game ID from the URL
            const gameId = getCurrentGameId();

            // retry mechanism for 429 errors
            let retries = 3; // number of retries
            let success = false;

            while (retries > 0 && !success) {
                try {
                    // fetch server data
                    const data = await new Promise((resolve, reject) => {
                        GM_xmlhttpRequest({
                            method: "GET",
                            url: `https://games.roblox.com/v1/games/${gameId}/servers/public?sortOrder=1&excludeFullGames=true&limit=25`,
                            onload: function(response) {
                                if (response.status === 429) {
                                    reject('429: Too Many Requests');
                                } else if (response.status >= 200 && response.status < 300) {
                                    resolve(JSON.parse(response.responseText));
                                } else {
                                    reject(`HTTP error: ${response.status}`);
                                }
                            },
                            onerror: function(error) {
                                reject(error);
                            },
                        });
                    });

                    // find servers with low player count, prob doesnet work with bloxfruits cause bots
                    let minPlayers = Infinity;
                    let targetServer = null;

                    for (const server of data.data) {
                        if (server.playing < minPlayers) {
                            minPlayers = server.playing;
                            targetServer = server;
                        }
                    }

                    if (targetServer) {
                        // join the server with the lowest player count
                        JoinServer(gameId, targetServer.id);
                        notifications(`Joining a server with ${targetServer.playing} player(s).`, 'success', '🚀');
                        success = true;
                    } else {
                        notifications('No available servers found.', 'error', '⚠️');
                        break;
                    }
                } catch (error) {
                    if (error === '429: Too Many Requests' && retries > 0) {
                        ConsoleLogEnabled('Rate limited. Retrying in 10 seconds...');
                        notifications('Rate limited. Retrying in 10 seconds...', 'warning', '⏳', '10000');
                        await delay(10000);
                        retries--;
                    } else {
                        ConsoleLogEnabled('Error fetching server data:', error);
                        notifications('Error: Failed to fetch server data. Please try again later.', 'error', '⚠️', '5000');
                        Loadingbar(false);
                        break;
                    }
                }
            }

            Loadingbar(false);
            disableFilterButton(false);
        }
        /*********************************************************************************************************************************************************************************************************************************************
                                                                 Functions for the 8th button. roblox borke it lmao. basically fillter code, might remove it one day

        *********************************************************************************************************************************************************************************************************************************************/


        /*********************************************************************************************************************************************************************************************************************************************
                                                                 End of: This is all the functions for the 8 buttons

        *********************************************************************************************************************************************************************************************************************************************/

        /*******************************************************
        name of function: disableLoadMoreButton
        description: Disables the "Load More" button
        *******************************************************/
        function disableLoadMoreButton() {
            const loadMoreButton = document.querySelector('.rbx-running-games-load-more');
            if (loadMoreButton) {
                loadMoreButton.disabled = true;
                loadMoreButton.style.opacity = '0.5';
                loadMoreButton.style.cursor = 'not-allowed';

                // only add the label if it doesnt already exist
                if (!loadMoreButton.textContent.includes('(Disabled by RoLocate)')) {
                    loadMoreButton.textContent += ' (Disabled by RoLocate)';
                }

                ConsoleLogEnabled('Load More button disabled with text change');
            } else {
                ConsoleLogEnabled('Load More button not found!');
            }
        }


        /*******************************************************
        name of function: Loadingbar
        description: Shows or hides a loading bar (now using pulsing boxes)
        *******************************************************/
        function Loadingbar(disable) {
            const serverListSection = document.querySelector('#rbx-public-running-games');
            const serverCardsContainer = document.querySelector('#rbx-public-game-server-item-container');
            const emptyGameInstancesContainer = document.querySelector('.section-content-off.empty-game-instances-container');
            const noServersMessage = emptyGameInstancesContainer?.querySelector('.no-servers-message');

            // check if the "Unable to load servers." message is visible
            if (!serverCardsContainer && noServersMessage?.textContent.includes('Unable to load servers.')) {
                notifications('Unable to load servers. Please refresh the page.', 'error', '⚠️', '8000');
                return;
            }

            // reset
            if (disable) {
                if (serverCardsContainer) {
                    serverCardsContainer.innerHTML = '';
                    serverCardsContainer.removeAttribute('style');
                }

                // no duplicate ones
                const existingLoadingBar = document.querySelector('#loading-bar');
                if (existingLoadingBar) {
                    existingLoadingBar.remove();
                }

                // create the laoding boxes
                const loadingContainer = document.createElement('div');
                loadingContainer.id = 'loading-bar';
                loadingContainer.style.cssText = `
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 5px;
            margin-top: 10px;
        `;

                const fragment = document.createDocumentFragment();
                for (let i = 0; i < 3; i++) {
                    const box = document.createElement('div');
                    box.style.cssText = `
                width: 10px;
                height: 10px;
                background-color: white;
                margin: 0 5px;
                border-radius: 2px;
                animation: pulse 1.2s ${i * 0.2}s infinite;
            `;
                    fragment.appendChild(box);
                }
                loadingContainer.appendChild(fragment);

                if (serverListSection) {
                    serverListSection.appendChild(loadingContainer);
                }

                // make thing look good
                const existingStyle = document.querySelector('#loading-style');
                if (!existingStyle) {
                    const styleSheet = document.createElement('style');
                    styleSheet.id = 'loading-style';
                    styleSheet.textContent = `
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.5); }
                }
            `;
                    document.head.appendChild(styleSheet);
                }

                // target by the unique select IDs that are created in the component
                const countryFilter_remove = document.getElementById('countryFilter');
                const cityFilter_remove = document.getElementById('cityFilter');
                const versionFilter_remove = document.getElementById('versionFilter');

                // find the dumb container
                let outerDiv = null;
                if (countryFilter_remove) {
                    outerDiv = countryFilter_remove.closest('div[style*="display: flex"][style*="gap: 16px"]');
                } else if (cityFilter_remove) {
                    outerDiv = cityFilter_remove.closest('div[style*="display: flex"][style*="gap: 16px"]');
                } else if (versionFilter_remove) {
                    outerDiv = versionFilter_remove.closest('div[style*="display: flex"][style*="gap: 16px"]');
                }
                // remove it
                if (outerDiv) {
                    outerDiv.remove();
                }

                // ik this approach sucks but its the best i can do. it remove ths premium messages with this specific
                // text so it doesnet remove the other stuff, you prob cant even understand what im sayin right now
                const premiumMessageDiv = document.querySelector('.premium-message-text');
                if (premiumMessageDiv) {
                    const messageText = premiumMessageDiv.textContent.trim();
                    const errorMessages = [
                        "Error: Cannot access server regions because you have not purchased the game.",
                        "Error: This game requires users to teleport to a subplace. As a result, server regions cannot be retrieved.",
                        "Error: Cannot access server regions because the creator has banned you from the game.",
                        "No servers found. The game may not have active public servers right now or is a solo game. Try refreshing the page."
                    ];

                    if (errorMessages.includes(messageText)) {
                        showMessage("END");
                    }
                }

            } else {
                // if disable is false, remove the loading bar
                const loadingBar = document.querySelector('#loading-bar');
                if (loadingBar) {
                    loadingBar.remove();
                }

                // reset any applied styles
                const styleSheet = document.querySelector('#loading-style');
                if (styleSheet) {
                    styleSheet.remove();
                }
            }
        }

        /*******************************************************
        name of function: disableFilterButton
        description: Disables or enables the filter button based on the input.
        *******************************************************/
        function disableFilterButton(disable) {
            const filterButton = document.querySelector('.RL-filter-button');
            const refreshButtons = document.querySelectorAll('.btn-more.rbx-refresh.refresh-link-icon.btn-control-xs.btn-min-width');
            const filterOverlayId = 'filter-button-overlay';
            const refreshOverlayClass = 'refresh-button-overlay';

            if (filterButton) {
                const parent = filterButton.parentElement;

                if (disable) {
                    // kill the filter button so it cant be clicked
                    filterButton.disabled = true;
                    filterButton.style.opacity = '0.5';
                    filterButton.style.cursor = 'not-allowed';

                    // an invisible overlay on it so no sneaky clicks
                    let overlay = document.getElementById(filterOverlayId);
                    if (!overlay) {
                        overlay = document.createElement('div');
                        overlay.id = filterOverlayId;
                        overlay.style.position = 'absolute';
                        overlay.style.top = '-10px';
                        overlay.style.left = '-10px';
                        overlay.style.width = 'calc(100% + 20px)';
                        overlay.style.height = 'calc(100% + 20px)';
                        overlay.style.backgroundColor = 'transparent';
                        overlay.style.zIndex = '9999';
                        overlay.style.pointerEvents = 'all'; // block clicks like a boss
                        parent.style.position = 'relative';
                        parent.appendChild(overlay);
                    }
                } else {
                    // bring the filter button back to life
                    filterButton.disabled = false;
                    filterButton.style.opacity = '1';
                    filterButton.style.cursor = 'pointer';

                    // remove that annoying overlay
                    const overlay = document.getElementById(filterOverlayId);
                    if (overlay) {
                        overlay.remove();
                    }
                }
            } else {
                ConsoleLogEnabled('Filter button not found! Something is wrong!');
                notifications("Something's wrong. Please report an issue on Greasyfork.", "error", "⚠️", "15000");
            }

            if (refreshButtons.length > 0) {
                refreshButtons.forEach((refreshButton) => {
                    const refreshParent = refreshButton.parentElement;

                    if (disable) {
                        // same overlay trick but for refresh buttons
                        let refreshOverlay = refreshParent.querySelector(`.${refreshOverlayClass}`);
                        if (!refreshOverlay) {
                            refreshOverlay = document.createElement('div');
                            refreshOverlay.className = refreshOverlayClass;
                            refreshOverlay.style.position = 'absolute';
                            refreshOverlay.style.top = '-10px';
                            refreshOverlay.style.left = '-10px';
                            refreshOverlay.style.width = 'calc(100% + 20px)';
                            refreshOverlay.style.height = 'calc(100% + 20px)';
                            refreshOverlay.style.backgroundColor = 'transparent';
                            refreshOverlay.style.zIndex = '9999';
                            refreshOverlay.style.pointerEvents = 'all'; // no clicks allowed here either
                            refreshParent.style.position = 'relative';
                            refreshParent.appendChild(refreshOverlay);
                        }
                    } else {
                        // remove overlays and let buttons live again
                        const refreshOverlay = refreshParent.querySelector(`.${refreshOverlayClass}`);
                        if (refreshOverlay) {
                            refreshOverlay.remove();
                        }
                    }
                });
            } else {
                ConsoleLogEnabled('Refresh button not found!');
                notifications("Something's wrong. Please report an issue on Greasyfork.", "error", "⚠️", "15000");
            }
        }

        /*******************************************************
        name of function: rbx_card
        description: Creates the roblox cards that are not from server regions
        *******************************************************/
        async function rbx_card(serverId, playerTokens, maxPlayers, playing, gameId) {
            const thumbnails = await fetchPlayerThumbnails(playerTokens, true);

            // helper function to create elements with properties
            const createElement = (tag, props = {}, styles = {}) => {
                const el = document.createElement(tag);
                Object.assign(el, props);
                Object.assign(el.style, styles);
                return el;
            };

            const cardItem = createElement('li', { className: 'rbx-game-server-item col-md-3 col-sm-4 col-xs-6' });
            const playerThumbnailsContainer = createElement('div', { className: 'player-thumbnails-container' });

            // add player thumbnails
            thumbnails.forEach(thumbnail => {
                const playerAvatar = createElement('span', { className: 'avatar avatar-headshot-md player-avatar' });
                const thumbnailImage = createElement('span', { className: 'thumbnail-2d-container avatar-card-image' });
                const img = createElement('img', { src: thumbnail.imageUrl, alt: '', title: '' });

                thumbnailImage.appendChild(img);
                playerAvatar.appendChild(thumbnailImage);
                playerThumbnailsContainer.appendChild(playerAvatar);
            });

            // add placeholder for remaining players
            if (playing > 5) {
                const placeholder = createElement('span', {
                    className: 'avatar avatar-headshot-md player-avatar hidden-players-placeholder',
                    textContent: `+${playing - 5}`
                }, {
                    backgroundColor: '#6a6f81', color: 'white', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
                    fontSize: '16px', width: '60px', height: '60px'
                });
                playerThumbnailsContainer.appendChild(placeholder);
            }

            // server details
            const serverDetails = createElement('div', { className: 'rbx-game-server-details game-server-details' });
            const serverStatus = createElement('div', {
                className: 'text-info rbx-game-status rbx-game-server-status text-overflow',
                textContent: `${playing} of ${maxPlayers} people max`
            });

            // player count gauge
            const gaugeContainer = createElement('div', { className: 'server-player-count-gauge border' });
            const gaugeInner = createElement('div', { className: 'gauge-inner-bar border' }, {
                width: `${(playing / maxPlayers) * 100}%`
            });
            gaugeContainer.appendChild(gaugeInner);

            // button container with buttons
            const buttonContainer = createElement('div', { className: 'button-container' }, {
                display: 'flex', gap: '8px'
            });

            // join button
            const joinButton = createElement('button', {
                type: 'button',
                className: 'btn-full-width btn-control-xs rbx-game-server-join game-server-join-btn btn-primary-md btn-min-width',
                textContent: 'Join',
                onclick: () => JoinServer(gameId, serverId)
            });

            // invite button
            const inviteButton = createElement('button', {
                type: 'button',
                className: 'btn-full-width btn-control-xs rbx-game-server-invite game-server-invite-btn btn-secondary-md btn-min-width',
                textContent: 'Invite'
            });

            inviteButton.onclick = async () => {
                const inviteLink = `https://oqarshi.github.io/Invite/?placeid=${gameId}&serverid=${serverId}`;
                ConsoleLogEnabled('Copied invite link:', inviteLink);

                try {
                    await navigator.clipboard.writeText(inviteLink);
                    notifications('Success! Invite link copied to clipboard!', 'success', '🎉', '2000');
                    ConsoleLogEnabled('Invite link copied to clipboard');

                    const originalText = inviteButton.textContent;
                    inviteButton.textContent = 'Copied!';
                    inviteButton.disabled = true;
                    setTimeout(() => {
                        inviteButton.textContent = originalText;
                        inviteButton.disabled = false;
                    }, 1000);
                } catch (error) {
                    ConsoleLogEnabled('Failed to copy invite link:', error);
                    notifications('Failed! Invite link copied to clipboard!', 'error', '⚠️', '2000');
                }
            };

            // uh create the stuff
            buttonContainer.append(joinButton, inviteButton);
            serverDetails.append(serverStatus, gaugeContainer, buttonContainer);

            const cardContainer = createElement('div', { className: 'card-item' });
            cardContainer.append(playerThumbnailsContainer, serverDetails);
            cardItem.appendChild(cardContainer);

            document.querySelector('#rbx-public-game-server-item-container').appendChild(cardItem);
        }
    }
})();