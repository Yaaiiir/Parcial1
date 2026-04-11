using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;
using TMPro;

public class MenuManager : MonoBehaviour
{
    [Header("=== PANELES ===")]
    public GameObject panelMain;
    public GameObject panelSonido;

    [Header("=== PANEL SONIDO ===")]
    public Slider sliderMusica;
    public Slider sliderEfectos;
    public TextMeshProUGUI txtMusica;
    public TextMeshProUGUI txtEfectos;

    [Header("=== AUDIO ===")]
    public AudioSource musicaMenu;
    public AudioClip clipMusica;        // arrastra un audio aqui
    public AudioClip clipClick;         // sonido al presionar botones

    void Start()
    {
        if (panelMain)   panelMain.SetActive(true);
        if (panelSonido) panelSonido.SetActive(false);

        // Cargar volúmenes guardados
        float musVol = PlayerPrefs.GetFloat("MusicVol", 0.5f);
        float sfxVol = PlayerPrefs.GetFloat("SFXVol",   0.8f);

        // Configurar sliders SIN disparar OnValueChanged
        if (sliderMusica)
        {
            sliderMusica.SetValueWithoutNotify(musVol);
        }
        if (sliderEfectos)
        {
            sliderEfectos.SetValueWithoutNotify(sfxVol);
        }

        // Actualizar textos
        ActualizarTextos(musVol, sfxVol);

        // Iniciar música del menú
        if (musicaMenu != null)
        {
            if (clipMusica != null) musicaMenu.clip = clipMusica;
            musicaMenu.loop   = true;
            musicaMenu.volume = musVol;
            if (!musicaMenu.isPlaying) musicaMenu.Play();
        }
    }

    // ─── BOTÓN JUGAR ───
    public void BotonJugar()
    {
        PlayClick();
        if (musicaMenu != null) musicaMenu.Stop();
        SceneManager.LoadScene(1);
    }

    // ─── BOTÓN SONIDO ───
    public void BotonSonido()
    {
        PlayClick();
        if (panelMain)   panelMain.SetActive(false);
        if (panelSonido) panelSonido.SetActive(true);
    }

    // ─── BOTÓN VOLVER ───
    public void BotonVolver()
    {
        PlayClick();
        if (panelSonido) panelSonido.SetActive(false);
        if (panelMain)   panelMain.SetActive(true);
    }

    // ─── BOTÓN SALIR ───
    public void BotonSalir()
    {
        PlayClick();
        Application.Quit();
        Debug.Log("[Menu] Saliendo...");
    }

    // ─── SLIDER MÚSICA ───
    public void CambiarMusica(float valor)
    {
        PlayerPrefs.SetFloat("MusicVol", valor);
        PlayerPrefs.Save();

        // Cambiar volumen en tiempo real
        if (musicaMenu != null) musicaMenu.volume = valor;

        // Actualizar texto
        if (txtMusica != null)
            txtMusica.text = $"Musica: {Mathf.RoundToInt(valor * 100)}%";
    }

    // ─── SLIDER EFECTOS ───
    public void CambiarEfectos(float valor)
    {
        PlayerPrefs.SetFloat("SFXVol", valor);
        PlayerPrefs.Save();

        // Actualizar texto
        if (txtEfectos != null)
            txtEfectos.text = $"Efectos: {Mathf.RoundToInt(valor * 100)}%";
    }

    void ActualizarTextos(float mus, float sfx)
    {
        if (txtMusica  != null) txtMusica.text  = $"Musica: {Mathf.RoundToInt(mus * 100)}%";
        if (txtEfectos != null) txtEfectos.text = $"Efectos: {Mathf.RoundToInt(sfx * 100)}%";
    }

    void PlayClick()
    {
        if (musicaMenu != null && clipClick != null)
            musicaMenu.PlayOneShot(clipClick, PlayerPrefs.GetFloat("SFXVol", 0.8f));
    }
}
