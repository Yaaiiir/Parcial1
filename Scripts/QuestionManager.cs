using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using System.Collections.Generic;
using TMPro;

// ============================================================
//  QuestionManager.cs
//  Genera preguntas matemáticas de opción múltiple
//  Compatible con Button y Button-TextMeshPro de Unity 6
//
//  ESTRUCTURA DE DIFICULTAD:
//  Nivel 1:       Preguntas 1-5 = Sumas | Preguntas 6-10 = Restas
//  Nivel 2:       Preguntas 1-5 = Multiplicación | Preguntas 6-10 = División
//  Bonus Nivel 3: Potencias y Raíz Cuadrada (alternando)
//  Niveles 4-10:  Ecuaciones con dificultad progresiva
// ============================================================

public class QuestionManager : MonoBehaviour
{
    public static QuestionManager Instance;

    [Header("=== UI PREGUNTAS ===")]
    public TextMeshProUGUI txtQuestion;
    public TextMeshProUGUI txtProgress;

    // Usamos GameObject[] para aceptar cualquier tipo de botón (TMP o normal)
    public GameObject[] answerButtons;
    public TextMeshProUGUI[] answerTexts;
    public Animator questionAnimator;

    [Header("=== COLORES BOTONES ===")]
    public Color colorNormal   = new Color(0.2f, 0.2f, 0.5f);
    public Color colorCorrect  = new Color(0.1f, 0.7f, 0.3f);
    public Color colorWrong    = new Color(0.8f, 0.1f, 0.1f);
    public Color colorDisabled = new Color(0.15f, 0.15f, 0.3f);

    // Internos
    private int correctIndex = -1;
    private bool answered = false;
    private MathQuestion currentQ;

    void Awake()
    {
        if (Instance == null) Instance = this;
        else { Destroy(gameObject); return; }
    }

    // ─────────────────────────────────────────────
    //  GENERAR PREGUNTA SEGÚN NIVEL
    // ─────────────────────────────────────────────
    public void GenerateQuestion()
    {
        answered = false;
        ResetButtonColors();

        int level   = GameManager.Instance.currentLevel;
        bool isBoss = GameManager.Instance.isBossLevel;
        bool isBonus= GameManager.Instance.isBonus;

        currentQ = CreateQuestionForLevel(level, isBoss, isBonus);

        txtQuestion.text = currentQ.questionText;

        int total   = isBoss ? GameManager.Instance.questionsBossLevel
                             : GameManager.Instance.questionsPerLevel;
        int current = GameManager.Instance.currentQuestion + 1;
        txtProgress.text = $"Pregunta {current} / {total}";

        List<string> options = ShuffleOptions(currentQ.correctAnswer, currentQ.wrongAnswers);
        for (int i = 0; i < answerButtons.Length; i++)
        {
            if (answerTexts != null && i < answerTexts.Length && answerTexts[i] != null)
                answerTexts[i].text = options[i];

            if (options[i] == currentQ.correctAnswer.ToString())
                correctIndex = i;
        }

        if (questionAnimator != null)
            questionAnimator.SetTrigger("QuestionIn");
    }

    // ─────────────────────────────────────────────
    //  CREAR PREGUNTA SEGÚN NIVEL
    // ─────────────────────────────────────────────
    MathQuestion CreateQuestionForLevel(int level, bool isBoss, bool isBonus)
    {
        if (isBonus) return CreateBonusQuestion(level);
        if (isBoss)  return CreateBossQuestion();

        int questionIndex = GameManager.Instance.currentQuestion; // 0-based

        switch (level)
        {
            // Nivel 1: primeras 5 sumas, segundas 5 restas
            case 1:
                return questionIndex < 5
                    ? SumaSimple(1, 10)
                    : RestaSimple(1, 15);

            // Nivel 2: primeras 5 multiplicaciones, segundas 5 divisiones
            case 2:
                return questionIndex < 5
                    ? MultiSimple(2, 9)
                    : DivisionSimple(2, 9);

            // Niveles 4 al 10: ecuaciones con dificultad progresiva
            case 4:  return EcuacionNivel(1);   // x + b = c  (números pequeños)
            case 5:  return EcuacionNivel(2);   // x + b = c  (números medianos) o x - b = c
            case 6:  return EcuacionNivel(3);   // x * b = c
            case 7:  return EcuacionNivel(4);   // x * b = c  (más difícil)
            case 8:  return EcuacionNivel(5);   // x / b = c
            case 9:  return EcuacionNivel(6);   // (x + b) * c = d
            case 10: return CreateBossQuestion();
            default: return SumaSimple(1, 10);
        }
    }

    // ─────────────────────────────────────────────
    //  ECUACIONES CON DIFICULTAD PROGRESIVA
    // ─────────────────────────────────────────────

    // Nivel 1 — x + b = c  (x del 1 al 15, b del 1 al 10)
    // Nivel 2 — x + b = c / x - b = c  (números medianos)
    // Nivel 3 — x * b = c  (tablas del 2 al 9)
    // Nivel 4 — x * b = c  (tablas del 5 al 12)
    // Nivel 5 — x / b = c  (divisiones exactas)
    // Nivel 6 — (x + b) * c = d  (ecuaciones compuestas)
    MathQuestion EcuacionNivel(int dificultad)
    {
        switch (dificultad)
        {
            case 1:
            {
                // x + b = c
                int x = Random.Range(1, 16);
                int b = Random.Range(1, 11);
                int c = x + b;
                return new MathQuestion(
                    $"Si x + {b} = {c}, cuanto vale x ?",
                    x, GenerateWrongAnswers(x, 1, 20));
            }
            case 2:
            {
                // Mitad suma, mitad resta
                if (Random.Range(0, 2) == 0)
                {
                    // x + b = c
                    int x = Random.Range(5, 26);
                    int b = Random.Range(5, 21);
                    int c = x + b;
                    return new MathQuestion(
                        $"Si x + {b} = {c}, cuanto vale x ?",
                        x, GenerateWrongAnswers(x, 1, 30));
                }
                else
                {
                    // x - b = c
                    int x = Random.Range(10, 31);
                    int b = Random.Range(1, x);
                    int c = x - b;
                    return new MathQuestion(
                        $"Si x - {b} = {c}, cuanto vale x ?",
                        x, GenerateWrongAnswers(x, 1, 35));
                }
            }
            case 3:
            {
                // x * b = c  (tablas del 2 al 9)
                int b = Random.Range(2, 10);
                int x = Random.Range(2, 10);
                int c = x * b;
                return new MathQuestion(
                    $"Si x * {b} = {c}, cuanto vale x ?",
                    x, GenerateWrongAnswers(x, 1, 12));
            }
            case 4:
            {
                // x * b = c  (tablas del 5 al 12, más difícil)
                int b = Random.Range(5, 13);
                int x = Random.Range(3, 13);
                int c = x * b;
                return new MathQuestion(
                    $"Si x * {b} = {c}, cuanto vale x ?",
                    x, GenerateWrongAnswers(x, 1, 15));
            }
            case 5:
            {
                // x / b = c  =>  x = b * c
                int b = Random.Range(2, 10);
                int c = Random.Range(2, 10);
                int x = b * c;
                return new MathQuestion(
                    $"Si x / {b} = {c}, cuanto vale x ?",
                    x, GenerateWrongAnswers(x, 2, x + 20));
            }
            case 6:
            {
                // (x + b) * c = d  =>  x = (d / c) - b
                int c = Random.Range(2, 6);
                int b = Random.Range(1, 8);
                int x = Random.Range(1, 10);
                int d = (x + b) * c;
                return new MathQuestion(
                    $"Si (x + {b}) * {c} = {d}, cuanto vale x ?",
                    x, GenerateWrongAnswers(x, 1, 15));
            }
            default: return EcuacionNivel(1);
        }
    }

    // ─────────────────────────────────────────────
    //  TIPOS DE PREGUNTAS BASE
    // ─────────────────────────────────────────────
    MathQuestion SumaSimple(int min, int max)
    {
        int a = Random.Range(min, max + 1);
        int b = Random.Range(min, max + 1);
        int answer = a + b;
        return new MathQuestion(
            $"Cuanto es {a} + {b} ?",
            answer, GenerateWrongAnswers(answer, 1, max * 2));
    }

    MathQuestion RestaSimple(int min, int max)
    {
        int a = Random.Range(min + 5, max + 1);
        int b = Random.Range(min, a);
        int answer = a - b;
        return new MathQuestion(
            $"Cuanto es {a} - {b} ?",
            answer, GenerateWrongAnswers(answer, 0, max));
    }

    MathQuestion MultiSimple(int min, int max)
    {
        int a = Random.Range(min, max + 1);
        int b = Random.Range(min, max + 1);
        int answer = a * b;
        return new MathQuestion(
            $"Cuanto es {a} x {b} ?",
            answer, GenerateWrongAnswers(answer, 2, max * max));
    }

    MathQuestion DivisionSimple(int min, int max)
    {
        int b = Random.Range(min, max + 1);
        int answer = Random.Range(min, max + 1);
        int a = b * answer;
        return new MathQuestion(
            $"Cuanto es {a} / {b} ?",
            answer, GenerateWrongAnswers(answer, 1, max));
    }

    MathQuestion PotenciaSimple()
    {
        int[] bases = { 2, 3, 4, 5, 6, 7, 8, 9, 10 };
        int b = bases[Random.Range(0, bases.Length)];
        int e = Random.Range(0, 2) == 0 ? 2 : 3;
        int answer = (int)Mathf.Pow(b, e);
        string expStr = e == 2 ? "al cuadrado" : "al cubo";
        return new MathQuestion(
            $"Cuanto es {b} {expStr} ?",
            answer, GenerateWrongAnswers(answer, 4, answer + 50));
    }

    // Raíz cuadrada de perfectos: 1,4,9,16,25,36,49,64,81,100,121,144
    MathQuestion RaizCuadrada()
    {
        int[] perfectos = { 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144 };
        int radicando = perfectos[Random.Range(0, perfectos.Length)];
        int answer = (int)Mathf.Sqrt(radicando);
        return new MathQuestion(
            $"Cual es la raiz cuadrada de {radicando} ?",
            answer, GenerateWrongAnswers(answer, 1, 15));
    }

    // ─────────────────────────────────────────────
    //  BONUS: POTENCIA Y RAÍZ CUADRADA (NIVEL 3)
    //  Bonus niveles 6 y 9 mantienen ecuaciones
    // ─────────────────────────────────────────────
    MathQuestion CreateBonusQuestion(int level)
    {
        if (level == 3)
        {
            // Alterna entre potencia y raíz cuadrada
            return Random.Range(0, 2) == 0 ? PotenciaSimple() : RaizCuadrada();
        }
        if (level == 6) return EcuacionNivel(3);
        // Bonus nivel 9
        return EcuacionNivel(5);
    }

    // ─────────────────────────────────────────────
    //  JEFE FINAL (NIVEL 10): MEZCLA DE TODO
    // ─────────────────────────────────────────────
    MathQuestion CreateBossQuestion()
    {
        int tipo = Random.Range(0, 6);
        switch (tipo)
        {
            case 0: return SumaSimple(10, 50);
            case 1: return MultiSimple(6, 15);
            case 2: return PotenciaSimple();
            case 3: return RaizCuadrada();
            case 4: return EcuacionNivel(4);
            default: return EcuacionNivel(6);
        }
    }

    // ─────────────────────────────────────────────
    //  GENERAR RESPUESTAS INCORRECTAS
    // ─────────────────────────────────────────────
    List<int> GenerateWrongAnswers(int correct, int min, int max)
    {
        List<int> wrongs = new List<int>();
        int attempts = 0;
        while (wrongs.Count < 3 && attempts < 100)
        {
            attempts++;
            int offset = Random.Range(1, Mathf.Max(4, (int)(correct * 0.4f) + 2));
            int candidate = Random.Range(0, 2) == 0 ? correct + offset : correct - offset;
            candidate = Mathf.Max(min, candidate);
            if (candidate != correct && !wrongs.Contains(candidate))
                wrongs.Add(candidate);
        }
        while (wrongs.Count < 3)
        {
            int fallback = correct + wrongs.Count + 1;
            if (!wrongs.Contains(fallback)) wrongs.Add(fallback);
        }
        return wrongs;
    }

    // ─────────────────────────────────────────────
    //  MEZCLAR OPCIONES
    // ─────────────────────────────────────────────
    List<string> ShuffleOptions(int correct, List<int> wrongs)
    {
        List<string> all = new List<string> { correct.ToString() };
        foreach (int w in wrongs) all.Add(w.ToString());
        for (int i = all.Count - 1; i > 0; i--)
        {
            int j = Random.Range(0, i + 1);
            (all[i], all[j]) = (all[j], all[i]);
        }
        return all;
    }

    // ─────────────────────────────────────────────
    //  BOTÓN PRESIONADO
    // ─────────────────────────────────────────────
    public void OnAnswerPressed(int index)
    {
        if (answered) return;
        answered = true;

        foreach (var btn in answerButtons)
        {
            if (btn == null) continue;
            var b = btn.GetComponent<Button>();
            if (b != null) b.interactable = false;
        }

        bool isCorrect = (index == correctIndex);
        StartCoroutine(ShowAnswerFeedback(index, isCorrect));
    }

    IEnumerator ShowAnswerFeedback(int selectedIndex, bool correct)
    {
        SetButtonColor(selectedIndex, correct ? colorCorrect : colorWrong);
        if (!correct)
        {
            SetButtonColor(correctIndex, colorCorrect);
            Handheld.Vibrate();
        }

        yield return new WaitForSeconds(1.0f);

        if (correct) GameManager.Instance.OnCorrectAnswer();
        else         GameManager.Instance.OnWrongAnswer();
    }

    // ─────────────────────────────────────────────
    //  HELPERS DE COLOR
    // ─────────────────────────────────────────────
    void SetButtonColor(int index, Color color)
    {
        if (index < 0 || index >= answerButtons.Length) return;
        var go = answerButtons[index];
        if (go == null) return;

        var img = go.GetComponent<Image>();
        if (img != null) img.color = color;

        if (img == null)
        {
            var imgs = go.GetComponentsInChildren<Image>();
            foreach (var i in imgs) i.color = color;
        }

        var tmp = go.GetComponentInChildren<TextMeshProUGUI>();
        if (tmp != null)
        {
            if (color == colorCorrect || color == colorWrong)
                tmp.color = Color.white;
        }
    }

    void ResetButtonColors()
    {
        foreach (var btn in answerButtons)
        {
            if (btn == null) continue;
            var img = btn.GetComponent<Image>();
            if (img != null) img.color = colorNormal;
            else
            {
                var imgs = btn.GetComponentsInChildren<Image>();
                foreach (var i in imgs) i.color = colorNormal;
            }
            var b = btn.GetComponent<Button>();
            if (b != null) b.interactable = true;
        }
    }
}

// ─────────────────────────────────────────────
//  ESTRUCTURA DE PREGUNTA
// ─────────────────────────────────────────────
[System.Serializable]
public class MathQuestion
{
    public string questionText;
    public int correctAnswer;
    public List<int> wrongAnswers;

    public MathQuestion(string q, int correct, List<int> wrongs)
    {
        questionText  = q;
        correctAnswer = correct;
        wrongAnswers  = wrongs;
    }
}
