const players = new Map();
let lastPlayer = null;

function setLastPlayer(player) {
    lastPlayer = player;
}

function toggleLastPlayer() {
    if (lastPlayer) {
        togglePlayer(lastPlayer);
    }
}

const queueKeySets = [
    '12345678',
    'qwertyui',
    'asdfghjk'
];

const playerIdToKeys = {
  'player-a': queueKeySets[0],
  'player-b': queueKeySets[1],
  'player-c': queueKeySets[2]
};

function buildQueuePointsFromDuration(keys, duration) {
    const queuePoints = {};
    const count = keys.length;
    keys.split('').forEach((key, i) => {
        // Distribute from start to just before the end
        const seekTime = Math.floor((i / count) * duration);
        queuePoints[key] = seekTime;
    });
    return queuePoints;
}

function registerOnInputCreatePlayer() {
    const containerIDList = document.querySelectorAll('[player-container-id]');

    containerIDList.forEach(item => {
        item.querySelector('input[type="text"]').addEventListener('blur', function () {
            const videoId = parseVideoIDFromURL(this.value);
            const playerId = item.getAttribute('player-container-id');
            const existingPlayer = players.get(playerId);
            if (existingPlayer && videoId) {
                swapVideo(existingPlayer.player, videoId, playerId)
                return
            }

            if (videoId) {
                createPlayer(videoId, playerId);
            }
        });
    })
}

function swapVideo(player, newVideoId, playerId) {
    player.loadVideoById(newVideoId);
    function checkDuration() {
        const duration = player.getDuration();
        // getDuration might return 0 initially
        if (duration > 0) {
            const keys = playerIdToKeys[playerId] || '';
            const queuePoints = buildQueuePointsFromDuration(keys, duration);
            players.set(playerId, { player, queuePoints });
        } else {
            setTimeout(checkDuration, 200); // try again after a bit
        }
    };

    checkDuration();
}

function createSamplerKeys(playerId) {
    const player = players.get(playerId);
    console.log(player)
    if (!player) {
        return;
    }

    const samplerKeys = document.querySelector(`[player-sampler-keys-id="${playerId}"]`);
    const { queuePoints } = player;
    Object.keys(queuePoints).forEach(key => {
        const keyElement = document.createElement('a');
        keyElement.textContent = key;
        keyElement.classList.add('video-slot-sampler-key'); // optional styling class
        samplerKeys.appendChild(keyElement);
    });
}

function createPlayer(videoId, playerId) {
    const newPlayer = new YT.Player(playerId, {
        height: '180',
        width: '320',
        videoId: videoId,
        playerVars: {
            controls: 0,         // 🔧 hide UI controls
            modestbranding: 1,   // 🔧 reduce YouTube branding
            rel: 0,              // 🔧 do not show related videos at the end
            fs: 0,               // 🔧 disable fullscreen button
            disablekb: 1,        // 🔧 disable keyboard controls
        },
        events: {
            'onReady': (event) => {
                const duration = event.target.getDuration();
                const keys = playerIdToKeys[playerId] || '';
                const queuePoints = buildQueuePointsFromDuration(keys, duration);
                players.set(playerId, { player: event.target, queuePoints });
                setLastPlayer(event.target);
                const samplerKeys = document.querySelector(`[player-sampler-keys-id="${playerId}"]`)
                createSamplerKeys(playerId);
            }
        }
    });

    // Save player and queuePoints together
}

function togglePlayer(playerElement) {
    const playerState = playerElement.getPlayerState();

    if (playerState === YT.PlayerState.PLAYING) {
        playerElement.pauseVideo();
    } else {
        playerElement.playVideo();
    }
}

function createPlayButton(player, handler) {
    const playButton = document.createElement('button');
    playButton.textContent = '||';
    playButton.style.display = 'block';
    playButton.style.marginTop = '5px';
    player.appendChild(playButton);
    player.addEventListener('click', handler);
}

function parseVideoIDFromURL(youtubeUrl) {
    try {
        const url = new URL(youtubeUrl);
        let videoID = null;

        if ((url.hostname === "www.youtube.com" || url.hostname === "youtube.com") && url.pathname === "/watch") {
            videoID = url.searchParams.get("v");
        } else if (url.hostname === "youtu.be") {
            videoID = url.pathname.slice(1);
        }

        const isValidID = /^[a-zA-Z0-9_-]{11}$/.test(videoID);
        return isValidID ? videoID : null;
    } catch {
        return null;
    }
}

document.addEventListener('keydown', (event) => {
    const key = event.key;
    console.log(key)
    console.log(players)

    if (key === " ") {
        toggleLastPlayer();
        return;
    }


    // Loop over all players and check their queuePoints
    for (const [_, { player, queuePoints }] of players) {
        if (queuePoints.hasOwnProperty(key)) {
            const seekTime = queuePoints[key];
            player.seekTo(seekTime, true);

            const playerState = player.getPlayerState();
            if (playerState !== YT.PlayerState.PLAYING) {
                player.playVideo();
            }
            console.log(seekTime);
            setLastPlayer(player);
            break; // only trigger for one player per key press
        }
    }
});
