using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using TMPro;

// ============================================================
//  UIManager.cs
//  Maneja todo el feedback visual del juego:
//  - Mensajes de correcto/incorrecto
//  - Toasts flotantes
//  - Pantallas de nivel completo, game over, victoria
//  - Barra de progreso del jefe
// ============================================================

public class UIManager : MonoBehaviour
{
    public static UIManager Instance;

    [Header("=== FEEDBACK RESPUESTA ===")]
    public GameObject feedbackPanel;
    public TextMeshProUGUI txtFeedbackMain;
    public TextMeshProUGUI txtFeedbackSub;
    public Image feedbackBG;
    public Color colorCorrectBG = new Color(0.1f, 0.6f, 0.2f, 0.85f);
    public Color colorWrongBG   = new Color(0.7f, 0.1f, 0.1f, 0.85f);

    [Header("=== TOAST FLOTANTE ===")]
    public GameObject toastPanel;
    public TextMeshProUGUI txtToast;

    [Header("=== NIVEL COMPLETO ===")]
    public TextMeshProUGUI txtLevelCompleteTitle;
    public TextMeshProUGUI txtLevelCompleteScore;
    public TextMeshProUGUI txtLevelCompleteAccuracy;
    public TextMeshProUGUI txtStars;
    public ParticleSystem confettiParticles;

    [Header("=== GAME OVER ===")]
    public TextMeshProUGUI txtGameOverScore;
    public TextMeshProUGUI txtGameOverLevel;
    public TextMeshProUGUI txtHighScore;

    [Header("=== VICTORIA ===")]
    public TextMeshProUGUI txtVictoryScore;
    public TextMeshProUGUI txtVictoryHighScore;
    public ParticleSystem victoryParticles;

    [Header("=== BARRA JEFE ===")]
    public GameObject bossHealthBar;
    public Image bossHealthFill;
    public TextMeshProUGUI txtBossHealth;
    private int bossMaxHealth = 8;
    private int bossCurrentHealth;

    [Header("=== ANIMADORES ===")]
    public Animator feedbackAnimator;
    public Animator toastAnimator;

    void Awake()
    {
        if (Instance == null) Instance = this;
        else { Destroy(gameObject); return; }
    }

    void Start()
    {
        if (feedbackPanel) feedbackPanel.SetActive(false);
        if (toastPanel)    toastPanel.SetActive(false);
        if (bossHealthBar) bossHealthBar.SetActive(false);
    }

    // ─────────────────────────────────────────────
    //  FEEDBACK CORRECTO / INCORRECTO
    // ─────────────────────────────────────────────
    public void ShowFeedback(bool correct, string main, string sub)
    {
        StopAllCoroutines();
        StartCoroutine(ShowFeedbackRoutine(correct, main, sub));
    }

    IEnumerator ShowFeedbackRoutine(bool correct, string main, string sub)
    {
        // Mostrar panel
        if (feedbackPanel) feedbackPanel.SetActive(true);

        // Cambiar color del fondo si existe
        if (feedbackBG != null)
            feedbackBG.color = correct ? colorCorrectBG : colorWrongBG;
        else if (feedbackPanel != null)
        {
            // Buscar Image en el panel
            var img = feedbackPanel.GetComponent<UnityEngine.UI.Image>();
            if (img) img.color = correct ? colorCorrectBG : colorWrongBG;
        }

        // Actualizar textos
        if (txtFeedbackMain) txtFeedbackMain.text = main;
        if (txtFeedbackSub)  txtFeedbackSub.text  = sub;

        // HP del jefe
        if (GameManager.Instance.isBossLevel && correct) HitBoss();

        yield return new WaitForSeconds(1.0f);

        // Ocultar panel
        if (feedbackPanel) feedbackPanel.SetActive(false);
    }

    // ─────────────────────────────────────────────
    //  TOAST FLOTANTE
    // ─────────────────────────────────────────────
    public void ShowToast(string message)
    {
        StopCoroutine("HideToast");
        StartCoroutine(ToastRoutine(message));
    }

    IEnumerator ToastRoutine(string msg)
    {
        toastPanel.SetActive(true);
        txtToast.text = msg;
        if (toastAnimator) toastAnimator.SetTrigger("Show");
        yield return new WaitForSeconds(2f);
        if (toastAnimator) toastAnimator.SetTrigger("Hide");
        yield return new WaitForSeconds(0.3f);
        toastPanel.SetActive(false);
    }

    // ─────────────────────────────────────────────
    //  PANTALLA: NIVEL COMPLETO
    // ─────────────────────────────────────────────
    public void ShowLevelCompleteInfo(int level, int score, int correct, int total)
    {
        txtLevelCompleteTitle.text = $"✅ ¡Nivel {level} Superado!";
        txtLevelCompleteScore.text = $"⭐ {score:N0} puntos";

        float accuracy = (float)correct / total * 100f;
        txtLevelCompleteAccuracy.text = $"Precisión: {accuracy:F0}%";

        // Estrellas según precisión
        string stars = accuracy >= 90 ? "⭐⭐⭐" : accuracy >= 70 ? "⭐⭐" : "⭐";
        if (txtStars) txtStars.text = stars;

        if (confettiParticles) confettiParticles.Play();
    }

    // ─────────────────────────────────────────────
    //  PANTALLA: GAME OVER
    // ─────────────────────────────────────────────
    public void ShowGameOverInfo(int score, int level)
    {
        if (txtGameOverScore) txtGameOverScore.text = $"Puntaje: {score:N0}";
        if (txtGameOverLevel) txtGameOverLevel.text = $"Llegaste al nivel {level}";
        if (txtHighScore)     txtHighScore.text     = $"🏆 Récord: {GameManager.Instance.highScore:N0}";
    }

    // ─────────────────────────────────────────────
    //  PANTALLA: VICTORIA
    // ─────────────────────────────────────────────
    public void ShowVictoryInfo(int score, int highScore)
    {
        if (txtVictoryScore)     txtVictoryScore.text     = $"⭐ {score:N0} puntos";
        if (txtVictoryHighScore) txtVictoryHighScore.text = $"🏆 Récord: {highScore:N0}";
        if (victoryParticles)    victoryParticles.Play();
    }

    // ─────────────────────────────────────────────
    //  BARRA DE VIDA DEL JEFE
    // ─────────────────────────────────────────────
    public void InitBossHealthBar()
    {
        bossMaxHealth = GameManager.Instance.questionsBossLevel;
        bossCurrentHealth = bossMaxHealth;

        if (bossHealthBar) bossHealthBar.SetActive(true);
        UpdateBossBar();
    }

    void HitBoss()
    {
        bossCurrentHealth--;
        UpdateBossBar();

        // Parpadeo rojo en la barra
        StartCoroutine(BossHitFlash());
    }

    void UpdateBossBar()
    {
        if (bossHealthFill)
        {
            float t = (float)bossCurrentHealth / bossMaxHealth;
            bossHealthFill.fillAmount = t;

            // Color según vida restante
            bossHealthFill.color = t > 0.6f ? Color.red :
                                   t > 0.3f ? new Color(1f, 0.5f, 0f) : Color.yellow;
        }
        if (txtBossHealth)
            txtBossHealth.text = $"💀 Jefe: {bossCurrentHealth}/{bossMaxHealth}";
    }

    IEnumerator BossHitFlash()
    {
        if (!bossHealthFill) yield break;
        Color original = bossHealthFill.color;
        bossHealthFill.color = Color.white;
        yield return new WaitForSeconds(0.15f);
        bossHealthFill.color = original;
    }
}
