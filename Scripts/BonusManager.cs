using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections;

// ============================================================
//  BonusManager.cs — MathQuest
//  Maneja los niveles BONUS (3, 6, 9)
//  El jugador elige: recuperar vida o aumentar daño
// ============================================================

public class BonusManager : MonoBehaviour
{
    public static BonusManager Instance;

    [Header("=== UI BONUS ===")]
    public GameObject panelBonusReward;
    public TextMeshProUGUI txtBonusTitle;
    public TextMeshProUGUI txtBonusDesc;
    public Button btnRecoverLife;
    public Button btnIncreaseDamage;

    // Opcionales — si no están conectados no falla
    public TextMeshProUGUI txtLifeBtn;
    public TextMeshProUGUI txtDamageBtn;

    void Awake()
    {
        if (Instance == null) Instance = this;
        else { Destroy(gameObject); return; }
    }

    // ─────────────────────────────────────────────
    //  MOSTRAR OPCIONES DE BONUS
    // ─────────────────────────────────────────────
    public void ShowBonusOptions()
    {
        if (panelBonusReward == null)
        {
            Debug.LogError("[BonusManager] panelBonusReward no está conectado!");
            return;
        }

        panelBonusReward.SetActive(true);

        int lives    = GameManager.Instance.currentLives;
        int maxLives = GameManager.Instance.maxLives;
        int dmg      = GameManager.Instance.damageMultiplier;
        int level    = GameManager.Instance.currentLevel;

        // Título según nivel bonus
        if (txtBonusTitle != null)
        {
            if (level == 3) txtBonusTitle.text = "NIVEL BONUS 1";
            else if (level == 6) txtBonusTitle.text = "NIVEL BONUS 2";
            else txtBonusTitle.text = "NIVEL BONUS 3";
        }

        // Descripción
        if (txtBonusDesc != null)
            txtBonusDesc.text = "Elige tu recompensa:";

        // Texto botón vida — solo si está conectado
        bool lifeAtMax = (lives >= maxLives);
        if (txtLifeBtn != null)
        {
            txtLifeBtn.text = lifeAtMax
                ? $"+1 Vida\n(llena {lives}/{maxLives})"
                : $"+1 Vida\n({lives} -> {lives + 1})";
        }

        // Texto botón daño — solo si está conectado
        if (txtDamageBtn != null)
            txtDamageBtn.text = $"+1 Dano\n(x{dmg} -> x{dmg + 1})";

        // Deshabilitar botón vida si está al máximo
        if (btnRecoverLife != null)
        {
            btnRecoverLife.interactable = !lifeAtMax;
            var img = btnRecoverLife.GetComponent<Image>();
            if (img != null)
                img.color = lifeAtMax
                    ? new Color(.3f, .3f, .3f, .5f)
                    : Color.white;
        }
    }

    // ─────────────────────────────────────────────
    //  ELEGIR RECUPERAR VIDA
    // ─────────────────────────────────────────────
    public void ChooseRecoverLife()
    {
        GameManager.Instance.GainLife();
        StartCoroutine(CloseAndContinue());
    }

    // ─────────────────────────────────────────────
    //  ELEGIR AUMENTAR DAÑO
    // ─────────────────────────────────────────────
    public void ChooseIncreaseDamage()
    {
        GameManager.Instance.IncreaseDamage();
        StartCoroutine(CloseAndContinue());
    }

    // ─────────────────────────────────────────────
    //  CERRAR Y CONTINUAR
    // ─────────────────────────────────────────────
    IEnumerator CloseAndContinue()
    {
        // Deshabilitar botones para evitar doble clic
        if (btnRecoverLife != null)    btnRecoverLife.interactable    = false;
        if (btnIncreaseDamage != null) btnIncreaseDamage.interactable = false;

        yield return new WaitForSeconds(0.5f);

        if (panelBonusReward != null)
            panelBonusReward.SetActive(false);

        // Rehabilitar botones para la próxima vez
        if (btnRecoverLife != null)    btnRecoverLife.interactable    = true;
        if (btnIncreaseDamage != null) btnIncreaseDamage.interactable = true;

        GameManager.Instance.NextLevel();
    }
}
