using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using System.Collections;
using System.Collections.Generic;
using TMPro;

// ============================================================
//  GameManager.cs — MathQuest (con Timer + Audio + Dificultad)
// ============================================================

public class GameManager : MonoBehaviour
{
    public static GameManager Instance;

    [Header("=== CONFIGURACIÓN DE NIVELES ===")]
    public int totalLevels        = 10;
    public int currentLevel       = 1;
    public int questionsPerLevel  = 5;
    public int questionsBossLevel = 8;

    [Header("=== NIVEL DE INICIO (pruebas) ===")]
    public int startLevel = 1;

    [Header("=== VIDAS ===")]
    public int maxLives     = 3;
    public int currentLives = 3;

    [Header("=== PUNTUACIÓN ===")]
    public int score             = 0;
    public int highScore         = 0;
    public int streakCount       = 0;
    public int damageMultiplier  = 1;

    [Header("=== DIFICULTAD ===")]
    [Tooltip("Puntos de bonificación por velocidad de respuesta")]
    public bool speedBonusEnabled = true;
    [Tooltip("El tiempo restante afecta los puntos ganados")]
    public bool timeAffectsScore  = true;

    [Header("=== ESTADO ===")]
    public bool isBonus    = false;
    public bool isBossLevel= false;
    public int  currentQuestion  = 0;
    public int  correctAnswers   = 0;

    [Header("=== UI REFERENCIAS ===")]
    public TextMeshProUGUI txtScore;
    public TextMeshProUGUI txtLevel;
    public TextMeshProUGUI txtLives;
    public TextMeshProUGUI txtStreak;
    public GameObject panelLevelComplete;
    public GameObject panelGameOver;
    public GameObject panelVictory;
    public GameObject panelBonus;
    public Animator screenAnimator;

    void Awake()
    {
        if (Instance == null) { Instance = this; DontDestroyOnLoad(gameObject); }
        else { Destroy(gameObject); return; }
        highScore = PlayerPrefs.GetInt("HighScore", 0);
    }

    void Start()
    {
        StartLevel(startLevel);
    }

    // ─── INICIAR NIVEL ───
    public void StartLevel(int level)
    {
        currentLevel    = level;
        currentQuestion = 0;
        correctAnswers  = 0;
        streakCount     = 0;

        isBossLevel = (level == 10);
        isBonus     = (!isBossLevel && level % 3 == 0);

        if (panelLevelComplete) panelLevelComplete.SetActive(false);
        if (panelBonus)         panelBonus.SetActive(false);
        if (panelGameOver)      panelGameOver.SetActive(false);
        if (panelVictory)       panelVictory.SetActive(false);

        // Música según tipo de nivel
        if (AudioManager.Instance != null)
        {
            if (isBossLevel)    AudioManager.Instance.PlayBossMusic();
            else if (isBonus)   AudioManager.Instance.PlayBonusMusic();
            else                AudioManager.Instance.PlayNormalMusic();
        }

        UpdateUI();
        if (QuestionManager.Instance != null)
            QuestionManager.Instance.GenerateQuestion();

        // Iniciar timer
        if (TimerManager.Instance != null)
            TimerManager.Instance.StartTimer();

        Debug.Log($"[MathQuest] Nivel {level} | Bonus:{isBonus} | Jefe:{isBossLevel}");
    }

    // ─── RESPUESTA CORRECTA ───
    public void OnCorrectAnswer()
    {
        // Detener timer
        float timeLeft = 0;
        if (TimerManager.Instance != null)
        {
            timeLeft = TimerManager.Instance.currentTime;
            TimerManager.Instance.StopTimer();
        }

        streakCount++;
        correctAnswers++;
        currentQuestion++;

        // Puntos base
        int basePoints = 100 * currentLevel;

        // Bonus por racha
        int streakBonus = (streakCount >= 3) ? 50 * streakCount : 0;

        // Bonus por velocidad (tiempo restante)
        int speedBonus = 0;
        if (speedBonusEnabled && timeAffectsScore)
            speedBonus = Mathf.RoundToInt(timeLeft * 10f);

        int gained = (basePoints + streakBonus + speedBonus) * damageMultiplier;
        score += gained;

        // Sonido
        if (AudioManager.Instance != null)
        {
            if (streakCount >= 3) AudioManager.Instance.PlayStreak();
            else                  AudioManager.Instance.PlayCorrect();
        }

        string extra = "";
        if (streakCount >= 3) extra = $"Racha x{streakCount}!";

        if (UIManager.Instance != null)
            UIManager.Instance.ShowFeedback(true, $"Correcto! +{gained}", extra);

        UpdateUI();
        CheckLevelComplete();
    }

    // ─── RESPUESTA INCORRECTA ───
    public void OnWrongAnswer()
    {
        if (TimerManager.Instance != null)
            TimerManager.Instance.StopTimer();

        streakCount = 0;
        currentQuestion++;
        LoseLife();

        if (AudioManager.Instance != null)
            AudioManager.Instance.PlayWrong();

        if (UIManager.Instance != null)
            UIManager.Instance.ShowFeedback(false, "Incorrecto!", "");

        UpdateUI();

        if (currentLives > 0)
            CheckLevelComplete();
    }

    // ─── TIEMPO AGOTADO ───
    public void OnTimeExpired()
    {
        streakCount = 0;
        currentQuestion++;
        LoseLife();

        if (AudioManager.Instance != null)
            AudioManager.Instance.PlayWrong();

        if (UIManager.Instance != null)
            UIManager.Instance.ShowFeedback(false, "Tiempo!", "Se acabo el tiempo");

        UpdateUI();

        if (currentLives > 0)
            CheckLevelComplete();
    }

    // ─── PERDER VIDA ───
    void LoseLife()
    {
        currentLives--;
        if (currentLives <= 0)
            StartCoroutine(TriggerGameOver());
    }

    // ─── RECUPERAR VIDA ───
    public void GainLife()
    {
        if (currentLives < maxLives)
        {
            currentLives++;
            UpdateUI();
            if (UIManager.Instance != null)
                UIManager.Instance.ShowToast("+1 Vida recuperada!");
        }
    }

    // ─── AUMENTAR DAÑO ───
    public void IncreaseDamage()
    {
        damageMultiplier++;
        if (UIManager.Instance != null)
            UIManager.Instance.ShowToast($"Dano x{damageMultiplier} activado!");
    }

    // ─── VERIFICAR NIVEL COMPLETO ───
    void CheckLevelComplete()
    {
        int totalQs = isBossLevel ? questionsBossLevel : questionsPerLevel;

        if (currentQuestion >= totalQs)
        {
            float successRate = (float)correctAnswers / totalQs;

            if (isBonus)
            {
                // En bonus: si acertó → muestra panel de recompensa
                // Si falló → pierde vida (ya se quitó) y salta al siguiente nivel sin bonus
                if (successRate >= 0.6f)
                    StartCoroutine(TriggerLevelComplete()); // muestra panel bonus
                else
                {
                    // Falló el bonus — salta directo al siguiente nivel sin recompensa
                    if (currentLives > 0)
                        StartCoroutine(SkipToNextLevel());
                }
                return;
            }

            if (successRate >= 0.6f)
                StartCoroutine(TriggerLevelComplete());
            else
            {
                // Solo reintentar — vida ya se quitó en OnWrongAnswer
                if (currentLives > 0) StartCoroutine(RetryLevel());
            }
        }
        else
        {
            if (currentLives > 0) StartCoroutine(NextQuestionDelay());
        }
    }

    IEnumerator SkipToNextLevel()
    {
        yield return new WaitForSeconds(1.5f);
        if (currentLevel < totalLevels)
            StartLevel(currentLevel + 1);
        else
            if (panelVictory) panelVictory.SetActive(true);
    }

    IEnumerator NextQuestionDelay()
    {
        yield return new WaitForSeconds(1.2f);
        if (QuestionManager.Instance != null)
            QuestionManager.Instance.GenerateQuestion();
        // Reiniciar timer para la siguiente pregunta
        if (TimerManager.Instance != null)
            TimerManager.Instance.StartTimer();
    }

    // ─── NIVEL COMPLETADO ───
    IEnumerator TriggerLevelComplete()
    {
        yield return new WaitForSeconds(1f);

        if (AudioManager.Instance != null)
        {
            if (isBossLevel)  AudioManager.Instance.PlayVictory();
            else if (isBonus) AudioManager.Instance.PlayBonus();
            else              AudioManager.Instance.PlayLevelUp();
        }

        if (isBossLevel)
        {
            SaveHighScore();
            if (panelVictory) panelVictory.SetActive(true);
        }
        else if (isBonus)
        {
            if (panelBonus) panelBonus.SetActive(true);
            if (BonusManager.Instance != null)
                BonusManager.Instance.ShowBonusOptions();
        }
        else
        {
            if (panelLevelComplete) panelLevelComplete.SetActive(true);
            if (UIManager.Instance != null)
                UIManager.Instance.ShowLevelCompleteInfo(
                    currentLevel, score, correctAnswers, questionsPerLevel);
        }
    }

    // ─── SIGUIENTE NIVEL ───
    public void NextLevel()
    {
        if (panelLevelComplete) panelLevelComplete.SetActive(false);
        if (panelBonus)         panelBonus.SetActive(false);
        if (currentLevel < totalLevels)
            StartLevel(currentLevel + 1);
        else
            if (panelVictory) panelVictory.SetActive(true);
    }

    IEnumerator RetryLevel()
    {
        yield return new WaitForSeconds(1.5f);
        StartLevel(currentLevel);
    }

    // ─── GAME OVER ───
    IEnumerator TriggerGameOver()
    {
        if (TimerManager.Instance != null)
            TimerManager.Instance.StopTimer();
        if (AudioManager.Instance != null)
            AudioManager.Instance.PlayGameOver();

        yield return new WaitForSeconds(1f);
        SaveHighScore();
        if (panelGameOver) panelGameOver.SetActive(true);
        if (UIManager.Instance != null)
            UIManager.Instance.ShowGameOverInfo(score, currentLevel);
    }

    // ─── REINICIAR JUEGO ───
    public void RestartGame()
    {
        score            = 0;
        currentLives     = maxLives;
        damageMultiplier = 1;
        streakCount      = 0;
        if (panelGameOver) panelGameOver.SetActive(false);
        if (panelVictory)  panelVictory.SetActive(false);
        StartLevel(1);
    }

    void SaveHighScore()
    {
        if (score > highScore)
        {
            highScore = score;
            PlayerPrefs.SetInt("HighScore", highScore);
            PlayerPrefs.Save();
        }
    }

    // ─── ACTUALIZAR UI ───
    void UpdateUI()
    {
        if (txtScore) txtScore.text = $"Puntos: {score:N0}";
        if (txtLevel) txtLevel.text = GetLevelLabel();
        if (txtLives) txtLives.text = GetLivesString();
        if (txtStreak)
        {
            txtStreak.gameObject.SetActive(streakCount >= 3);
            if (streakCount >= 3) txtStreak.text = $"Racha x{streakCount}";
        }
    }

    string GetLevelLabel()
    {
        if (isBossLevel) return "JEFE FINAL";
        if (isBonus)     return $"BONUS {currentLevel}";
        return $"Nivel {currentLevel}";
    }

    string GetLivesString()
    {
        string s = "Vidas: ";
        for (int i = 0; i < maxLives; i++)
            s += (i < currentLives) ? "[v] " : "[x] ";
        return s;
    }

    // ─── IR AL MENÚ ───
    public void IrAlMenu()
    {
        if (TimerManager.Instance != null)
            TimerManager.Instance.StopTimer();
        if (AudioManager.Instance != null)
            AudioManager.Instance.StopMusic();
        SceneManager.LoadScene(0);
    }
}
