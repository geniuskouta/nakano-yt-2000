const players = new Map();
let lastPlayer = null;

function setLastPlayer(player) {
    lastPlayer = player;
}

function toggleLastPlayer() {
    if(lastPlayer) {
        togglePlayer(lastPlayer);
    }
}

const queueKeySets = [
    '123456789',
    'qwertyuio',
    'asdfghjkl'
];

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
    const containerIDList = [
        'player-container-a',
        'player-container-b',
        'player-container-c'
    ]

    containerIDList.forEach(item => {
        const container = document.getElementById(item);
        container.querySelector('input[type="text"]').addEventListener('blur', function () {
            const videoId = parseVideoIDFromURL(this.value);
            
            const playerId = `player-${item.split('-')[2]}`;
            const existingPlayer = players.get(playerId);

            if(existingPlayer && videoId) {
                swapVideo(existingPlayer.player, videoId);
                return
            }

            if(videoId) {
                createPlayer(videoId, playerId);
            }
        });
    })
}

function swapVideo(player, newVideoId) {
  player.loadVideoById(newVideoId);
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
                const keys = queueKeySets[players.size]
                const queuePoints = buildQueuePointsFromDuration(keys, duration);
                players.set(playerId, { player: event.target, queuePoints });
                setLastPlayer(event.target);
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

        // Only allow www.youtube.com
        if (url.hostname !== "www.youtube.com") return null;

        // Must be the /watch path
        if (url.pathname !== "/watch") return null;

        // Get the 'v' parameter
        const videoID = url.searchParams.get("v");

        // Validate the ID format (11-character YouTube ID)
        const isValidID = /^[a-zA-Z0-9_-]{11}$/.test(videoID);
        return isValidID ? videoID : null;
    } catch {
        return null; // Not a valid URL
    }
}
document.addEventListener('keydown', (event) => {
    const key = event.key;
    console.log(key)
    console.log(players)

    if(key === " ") {
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
