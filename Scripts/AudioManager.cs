using UnityEngine;

// ============================================================
//  AudioManager.cs — MathQuest
//  Maneja música y efectos de sonido
// ============================================================

public class AudioManager : MonoBehaviour
{
    public static AudioManager Instance;

    [Header("=== MÚSICA DE FONDO ===")]
    public AudioSource musicSource;
    public AudioClip bgNormal;   // música niveles normales
    public AudioClip bgBonus;    // música nivel bonus
    public AudioClip bgBoss;     // música jefe final

    [Header("=== EFECTOS DE SONIDO ===")]
    public AudioSource sfxSource;
    public AudioClip sfxCorrect;    // respuesta correcta
    public AudioClip sfxWrong;      // respuesta incorrecta
    public AudioClip sfxLevelUp;    // nivel completado
    public AudioClip sfxBonus;      // nivel bonus
    public AudioClip sfxGameOver;   // game over
    public AudioClip sfxVictory;    // victoria
    public AudioClip sfxClick;      // clic botón
    public AudioClip sfxStreak;     // racha activada
    public AudioClip sfxTimerLow;   // tiempo bajo (últimos 5 seg)

    [Header("=== VOLUMEN ===")]
    [Range(0f,1f)] public float musicVolume = 0.5f;
    [Range(0f,1f)] public float sfxVolume   = 0.8f;

    void Awake()
    {
        if (Instance == null) { Instance = this; DontDestroyOnLoad(gameObject); }
        else { Destroy(gameObject); return; }

        musicVolume = PlayerPrefs.GetFloat("MusicVol", 0.5f);
        sfxVolume   = PlayerPrefs.GetFloat("SFXVol",   0.8f);
        if (musicSource) musicSource.volume = musicVolume;
    }

    // ─── MÚSICA ───
    public void PlayNormalMusic() => SwitchMusic(bgNormal);
    public void PlayBonusMusic()  => SwitchMusic(bgBonus);
    public void PlayBossMusic()   => SwitchMusic(bgBoss);
    public void StopMusic()       { if (musicSource) musicSource.Stop(); }

    void SwitchMusic(AudioClip clip)
    {
        if (!musicSource || !clip) return;
        if (musicSource.clip == clip && musicSource.isPlaying) return;
        musicSource.clip   = clip;
        musicSource.loop   = true;
        musicSource.volume = musicVolume;
        musicSource.Play();
    }

    // ─── EFECTOS ───
    public void PlayCorrect()   => Play(sfxCorrect);
    public void PlayWrong()     => Play(sfxWrong);
    public void PlayLevelUp()   => Play(sfxLevelUp);
    public void PlayBonus()     => Play(sfxBonus);
    public void PlayGameOver()  => Play(sfxGameOver);
    public void PlayVictory()   => Play(sfxVictory);
    public void PlayClick()     => Play(sfxClick);
    public void PlayStreak()    => Play(sfxStreak);
    public void PlayTimerLow()  => Play(sfxTimerLow);

    void Play(AudioClip clip)
    {
        if (!sfxSource || !clip) return;
        sfxSource.PlayOneShot(clip, sfxVolume);
    }

    public void SetMusicVolume(float v)
    {
        musicVolume = v;
        if (musicSource) musicSource.volume = v;
        PlayerPrefs.SetFloat("MusicVol", v);
    }

    public void SetSFXVolume(float v)
    {
        sfxVolume = v;
        PlayerPrefs.SetFloat("SFXVol", v);
    }
}
