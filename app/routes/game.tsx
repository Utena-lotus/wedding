import React, { useEffect, useRef, useState, useCallback } from "react";

// 型定義
type GameState = {
  isGameOver: boolean;
  score: number;
  distanceTraveled: number;
};

type Dino = {
  x: number;
  y: number;
  width: number;
  height: number;
  jumping: boolean;
  jumpStrength: number;
  velocity: number;
  gravity: number;
};

type Obstacle = {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "cactus1" | "cactus2" | "cactus3" | "bird";
};

type Item = {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "star" | "coin";
};

type GameData = {
  obstacles: Obstacle[];
  items: Item[];
  lastObstacleTime: number;
  flagPosition: number;
  invincible: boolean;
  invincibleTimer: number;
  itemsCollected: number;
  gameSpeed: number;
  dino: Dino;
  images: { [key: string]: HTMLImageElement };
  backgroundX: number;
};

const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    isGameOver: true,
    score: 0,
    distanceTraveled: 0,
  });
  const [imagesLoaded, setImagesLoaded] = useState<boolean>(false);

  const CANVAS_SIZE = 400;
  const GOAL_DISTANCE = 10000;
  const GROUND_HEIGHT = 20;
  const BACKGROUND_SCROLL_SPEED = 0.5; // ゲームスピードの1/2

  const gameDataRef = useRef<GameData>({
    obstacles: [],
    items: [],
    lastObstacleTime: 0,
    flagPosition: CANVAS_SIZE + GOAL_DISTANCE,
    invincible: false,
    invincibleTimer: 0,
    itemsCollected: 0,
    gameSpeed: 5,
    dino: {
      x: 50,
      y: CANVAS_SIZE - GROUND_HEIGHT - 40,
      width: 40,
      height: 44,
      jumping: false,
      jumpStrength: 15,
      velocity: 0,
      gravity: 0.8,
    },
    images: {},
    backgroundX: 0,
  });

  const startGame = useCallback(() => {
    setGameState({
      isGameOver: false,
      score: 0,
      distanceTraveled: 0,
    });
    gameDataRef.current = {
      ...gameDataRef.current,
      obstacles: [],
      items: [],
      lastObstacleTime: 0,
      flagPosition: CANVAS_SIZE + GOAL_DISTANCE,
      invincible: false,
      invincibleTimer: 0,
      itemsCollected: 0,
      gameSpeed: 5,
      backgroundX: 0, // 背景位置をリセット
      dino: {
        ...gameDataRef.current.dino,
        y: CANVAS_SIZE - GROUND_HEIGHT - 40,
        jumping: false,
        velocity: 0,
      },
    };
  }, []);

  const jump = useCallback(() => {
    const gameData = gameDataRef.current;
    if (!gameData.dino.jumping) {
      gameData.dino.jumping = true;
      gameData.dino.velocity = -gameData.dino.jumpStrength;
    }
  }, []);

  const handleAction = useCallback(() => {
    if (gameState.isGameOver) {
      startGame();
    } else {
      jump();
    }
  }, [gameState.isGameOver, startGame, jump]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        handleAction();
      }
    },
    [handleAction]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameData = gameDataRef.current;

    // 背景画像の幅を計算
    // ゴール距離の2倍の幅があれば、ゲーム中に背景が途切れることはありません
    // const backgroundWidth = GOAL_DISTANCE * 2;

    // 画像の読み込み
    const imageUrls: { [key: string]: string } = {
      dino: "app/images/dino/dino.gif",
      cactus1: "app/images/bicycles/bicycle_6.gif",
      cactus2: "app/images/bicycles/bicycle_12.gif",
      cactus3: "app/images/bicycles/tricycle.gif",
      bird: "app/images/bird/bird.gif",
      flag: "app/images/flag/flag.png",
      star: "app/images/star/star.png",
      coin: "app/images/coin/coin.png",
      background: "app/images/background/background.jpg", // 背景画像を追加
    };

    const loadImages = () => {
      const imagePromises = Object.entries(imageUrls).map(([key, url]) => {
        return new Promise<[string, HTMLImageElement]>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve([key, img]);
          img.onerror = reject;
          img.src = url;
        });
      });

      Promise.all(imagePromises)
        .then((loadedImages) => {
          gameData.images = Object.fromEntries(loadedImages);
          setImagesLoaded(true);
        })
        .catch((error) => {
          console.error("Failed to load images:", error);
        });
    };

    loadImages();

    function drawBackground() {
      const bgImage = gameData.images.background;
      const bgWidth = bgImage.width;

      // 背景画像を描画
      ctx!.drawImage(
        bgImage,
        gameData.backgroundX,
        0,
        CANVAS_SIZE,
        CANVAS_SIZE,
        0,
        0,
        CANVAS_SIZE,
        CANVAS_SIZE
      );

      // 画像の端が見えたら、次の部分を描画
      if (gameData.backgroundX + CANVAS_SIZE > bgWidth) {
        ctx!.drawImage(
          bgImage,
          0,
          0,
          CANVAS_SIZE - (bgWidth - gameData.backgroundX),
          CANVAS_SIZE,
          bgWidth - gameData.backgroundX,
          0,
          CANVAS_SIZE - (bgWidth - gameData.backgroundX),
          CANVAS_SIZE
        );
      }

      // 背景をスクロール（左から右）
      gameData.backgroundX += gameData.gameSpeed * BACKGROUND_SCROLL_SPEED;

      // 背景が一周したらリセット
      if (gameData.backgroundX <= -bgWidth) {
        gameData.backgroundX = 0;
      }
    }

    function drawDino() {
      ctx!.globalAlpha = gameData.invincible ? 0.5 : 1;
      ctx!.drawImage(
        gameData.images.dino,
        gameData.dino.x,
        gameData.dino.y,
        gameData.dino.width,
        gameData.dino.height
      );
      ctx!.globalAlpha = 1;
    }

    function drawObstacles() {
      gameData.obstacles.forEach((obstacle) => {
        ctx!.drawImage(
          gameData.images[obstacle.type],
          obstacle.x,
          obstacle.y,
          obstacle.width,
          obstacle.height
        );
      });
    }

    function drawItems() {
      gameData.items.forEach((item) => {
        ctx!.drawImage(
          gameData.images[item.type],
          item.x,
          item.y,
          item.width,
          item.height
        );
      });
    }

    function drawFlag() {
      if (gameData.flagPosition <= CANVAS_SIZE) {
        ctx!.drawImage(
          gameData.images.flag,
          gameData.flagPosition,
          CANVAS_SIZE - GROUND_HEIGHT - 80,
          20,
          80
        );
      }
    }

    function moveObstacles() {
      gameData.obstacles.forEach((obstacle) => {
        obstacle.x -= gameData.gameSpeed;
      });
      gameData.obstacles = gameData.obstacles.filter(
        (obstacle) => obstacle.x + obstacle.width > 0
      );

      gameData.items.forEach((item) => {
        item.x -= gameData.gameSpeed;
      });
      gameData.items = gameData.items.filter((item) => item.x + item.width > 0);

      gameData.flagPosition -= gameData.gameSpeed;
      setGameState((prev) => ({
        ...prev,
        distanceTraveled: prev.distanceTraveled + gameData.gameSpeed,
      }));
    }

    function spawnObstacle() {
      const currentTime = Date.now();
      if (
        currentTime - gameData.lastObstacleTime > 1500 &&
        gameState.distanceTraveled + CANVAS_SIZE < GOAL_DISTANCE
      ) {
        if (Math.random() < 0.7) {
          const cactusType = `cactus${Math.floor(Math.random() * 3) + 1}` as
            | "cactus1"
            | "cactus2"
            | "cactus3";
          gameData.obstacles.push({
            x: CANVAS_SIZE,
            y: CANVAS_SIZE - GROUND_HEIGHT - 32,
            width: 32,
            height: 32,
            type: cactusType,
          });
        } else {
          gameData.obstacles.push({
            x: CANVAS_SIZE,
            y: CANVAS_SIZE - GROUND_HEIGHT - 60 - Math.random() * 50,
            width: 40,
            height: 30,
            type: "bird",
          });
        }
        gameData.lastObstacleTime = currentTime;
      }

      if (
        Math.random() < 0.015 &&
        gameState.distanceTraveled + CANVAS_SIZE < GOAL_DISTANCE
      ) {
        if (Math.random() < 0.9) {
          gameData.items.push({
            x: CANVAS_SIZE,
            y: CANVAS_SIZE - GROUND_HEIGHT - 60 - Math.random() * 50,
            width: 20,
            height: 20,
            type: "coin",
          });
        } else {
          gameData.items.push({
            x: CANVAS_SIZE,
            y: CANVAS_SIZE - GROUND_HEIGHT - 60 - Math.random() * 50,
            width: 20,
            height: 20,
            type: "star",
          });
        }
      }
    }

    function checkCollision() {
      return gameData.obstacles.some(
        (obstacle) =>
          gameData.dino.x < obstacle.x + obstacle.width &&
          gameData.dino.x + gameData.dino.width > obstacle.x &&
          gameData.dino.y < obstacle.y + obstacle.height &&
          gameData.dino.y + gameData.dino.height > obstacle.y
      );
    }

    function checkItemCollision() {
      gameData.items = gameData.items.filter((item) => {
        if (
          gameData.dino.x < item.x + item.width &&
          gameData.dino.x + gameData.dino.width > item.x &&
          gameData.dino.y < item.y + item.height &&
          gameData.dino.y + gameData.dino.height > item.y
        ) {
          if (item.type === "star") {
            gameData.invincible = true;
            gameData.invincibleTimer = 300;
          } else if (item.type === "coin") {
            setGameState((prev) => ({ ...prev, score: prev.score + 100 }));
          }
          gameData.itemsCollected++;
          return false;
        }
        return true;
      });
    }

    function updateDino() {
      if (gameData.dino.jumping) {
        gameData.dino.velocity += gameData.dino.gravity;
        gameData.dino.y += gameData.dino.velocity;

        if (
          gameData.dino.y >
          CANVAS_SIZE - GROUND_HEIGHT - gameData.dino.height
        ) {
          gameData.dino.y = CANVAS_SIZE - GROUND_HEIGHT - gameData.dino.height;
          gameData.dino.jumping = false;
          gameData.dino.velocity = 0;
        }
      }

      if (gameData.invincible) {
        gameData.invincibleTimer--;
        if (gameData.invincibleTimer <= 0) {
          gameData.invincible = false;
        }
      }
    }

    function updateScore() {
      setGameState((prev) => ({
        ...prev,
        score: prev.score + Math.floor(gameData.gameSpeed),
      }));
    }

    function drawGround() {
      ctx!.fillStyle = "#8B4513";
      ctx!.fillRect(0, CANVAS_SIZE - GROUND_HEIGHT, CANVAS_SIZE, GROUND_HEIGHT);
    }

    function drawProgressBar() {
      const progress = Math.min(gameState.distanceTraveled / GOAL_DISTANCE, 1);
      ctx!.fillStyle = "#ddd";
      ctx!.fillRect(10, 10, CANVAS_SIZE - 20, 20);
      ctx!.fillStyle = "#4CAF50";
      ctx!.fillRect(10, 10, (CANVAS_SIZE - 20) * progress, 20);
      ctx!.strokeStyle = "#333";
      ctx!.strokeRect(10, 10, CANVAS_SIZE - 20, 20);
    }

    function gameOver(won: boolean = false) {
      setGameState((prev) => ({ ...prev, isGameOver: true }));
      if (gameLoopRef.current !== null) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      drawGameOverScreen(won);
    }

    function drawGameOverScreen(won: boolean) {
      ctx!.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx!.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx!.fillStyle = "#fff";
      ctx!.font = "30px Arial";
      ctx!.textAlign = "center";
      if (won) {
        ctx!.fillText(
          "ゴール達成！おめでとう！",
          CANVAS_SIZE / 2,
          CANVAS_SIZE / 2 - 30
        );
      } else {
        ctx!.fillText("ゲームオーバー", CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 30);
      }
      ctx!.font = "20px Arial";
      ctx!.fillText(
        `最終スコア: ${gameState.score}`,
        CANVAS_SIZE / 2,
        CANVAS_SIZE / 2 + 10
      );
      ctx!.fillText(
        "スペースキーでリスタート",
        CANVAS_SIZE / 2,
        CANVAS_SIZE / 2 + 50
      );
    }

    function update() {
      if (gameState.isGameOver) {
        drawGameOverScreen(gameState.distanceTraveled >= GOAL_DISTANCE);
        return;
      }

      ctx!.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      drawBackground();
      drawGround();
      drawDino();
      drawObstacles();
      drawItems();
      drawFlag();
      moveObstacles();
      spawnObstacle();
      updateDino();
      updateScore();
      drawProgressBar();
      checkItemCollision();

      if (checkCollision() && !gameData.invincible) {
        gameOver(false);
        return;
      }

      if (gameState.distanceTraveled >= GOAL_DISTANCE) {
        gameOver(true);
        return;
      }

      gameLoopRef.current = requestAnimationFrame(update);
    }

    // 初期画面の描画
    function drawInitialScreen() {
      ctx!.fillStyle = "#333";
      ctx!.font = "20px Arial";
      ctx!.textAlign = "center";
      ctx!.fillText(
        "タップまたはスペースキーでスタート",
        CANVAS_SIZE / 2,
        CANVAS_SIZE / 2
      );
      ctx!.textAlign = "left";
      drawBackground();
      drawGround();
    }

    if (imagesLoaded) {
      if (gameState.isGameOver) {
        drawInitialScreen();
      } else {
        gameLoopRef.current = requestAnimationFrame(update);
      }
    }

    // キーボードイベントリスナーの設定
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        handleAction();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    canvas.addEventListener(
      "touchstart",
      handleAction as unknown as EventListener
    );

    // クリーンアップ関数
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      canvas.removeEventListener(
        "touchstart",
        handleAction as unknown as EventListener
      );
      if (gameLoopRef.current !== null) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [
    gameState.isGameOver,
    handleAction,
    imagesLoaded,
    gameState.score,
    gameState.distanceTraveled,
  ]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        style={{ border: "1px solid black" }}
        onTouchStart={handleAction}
      />
    </div>
  );
};

export default Game;
