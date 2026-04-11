using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections;

// ============================================================
//  TimerManager.cs — MathQuest
//  Barra de tiempo visual con presión progresiva
//  - Normal:  15 segundos
//  - Avanzado (nivel 5+): 12 segundos  
//  - Boss:    10 segundos
//  Si el tiempo se acaba → pierde una vida
// ============================================================

public class TimerManager : MonoBehaviour
{
    public static TimerManager Instance;

    [Header("=== UI BARRA DE TIEMPO ===")]
    public Image timerBarFill;          // barra que se vacía
    public TextMeshProUGUI txtTimer;    // número de segundos
    public GameObject timerContainer;  // contenedor de la barra

    [Header("=== CONFIGURACIÓN ===")]
    public float timeNormal   = 15f;   // niveles 1-4
    public float timeAdvanced = 12f;   // niveles 5-9
    public float timeBoss     = 10f;   // nivel 10

    [Header("=== COLORES ===")]
    public Color colorFull    = new Color(0.2f, 0.8f, 0.2f); // verde
    public Color colorMid     = new Color(1f,   0.7f, 0f);   // amarillo
    public Color colorLow     = new Color(1f,   0.2f, 0.2f); // rojo

    // Internos
    private float maxTime;
    public float currentTime;
    private bool  isRunning = false;
    private bool  timerLowPlayed = false;
    private Coroutine timerCoroutine;

    void Awake()
    {
        if (Instance == null) Instance = this;
        else { Destroy(gameObject); return; }
    }

    // ─── INICIAR TEMPORIZADOR ───
    public void StartTimer()
    {
        int level = GameManager.Instance.currentLevel;
        bool isBoss = GameManager.Instance.isBossLevel;

        if (isBoss)
            maxTime = timeBoss;
        else if (level >= 5)
            maxTime = timeAdvanced;
        else
            maxTime = timeNormal;

        currentTime = maxTime;
        timerLowPlayed = false;
        isRunning = true;

        if (timerContainer) timerContainer.SetActive(true);
        UpdateBar();

        if (timerCoroutine != null) StopCoroutine(timerCoroutine);
        timerCoroutine = StartCoroutine(RunTimer());
    }

    // ─── DETENER TEMPORIZADOR ───
    public void StopTimer()
    {
        isRunning = false;
        if (timerCoroutine != null)
        {
            StopCoroutine(timerCoroutine);
            timerCoroutine = null;
        }
    }

    // ─── CORRUTINA DEL TIMER ───
    IEnumerator RunTimer()
    {
        while (currentTime > 0 && isRunning)
        {
            yield return new WaitForSeconds(0.1f);
            currentTime -= 0.1f;
            currentTime = Mathf.Max(0, currentTime);
            UpdateBar();

            // Sonido cuando quedan 5 segundos
            if (currentTime <= 5f && !timerLowPlayed)
            {
                timerLowPlayed = true;
                if (AudioManager.Instance != null)
                    AudioManager.Instance.PlayTimerLow();
            }
        }

        // Tiempo agotado
        if (isRunning && currentTime <= 0)
            OnTimerExpired();
    }

    // ─── TIEMPO AGOTADO ───
    void OnTimerExpired()
    {
        isRunning = false;
        Debug.Log("[Timer] Tiempo agotado!");

        // Hace vibrar la barra
        StartCoroutine(ShakeBar());

        // Le dice al GameManager que fue respuesta incorrecta
        if (GameManager.Instance != null)
            GameManager.Instance.OnTimeExpired();
    }

    // ─── ACTUALIZAR BARRA VISUAL ───
    void UpdateBar()
    {
        if (!timerBarFill) return;

        float ratio = currentTime / maxTime;
        timerBarFill.fillAmount = ratio;

        // Color dinámico
        if (ratio > 0.5f)
            timerBarFill.color = colorFull;
        else if (ratio > 0.25f)
            timerBarFill.color = colorMid;
        else
            timerBarFill.color = colorLow;

        // Texto del contador
        if (txtTimer)
            txtTimer.text = Mathf.CeilToInt(currentTime).ToString();
    }

    // ─── ANIMACIÓN DE SACUDIDA ───
    IEnumerator ShakeBar()
    {
        if (!timerContainer) yield break;
        Vector3 original = timerContainer.transform.localPosition;
        for (int i = 0; i < 6; i++)
        {
            timerContainer.transform.localPosition = original + new Vector3(
                Random.Range(-8f, 8f), Random.Range(-4f, 4f), 0);
            yield return new WaitForSeconds(0.05f);
        }
        timerContainer.transform.localPosition = original;
    }
}
