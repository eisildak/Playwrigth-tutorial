Feature: Header-1 dropdown link kontrolu
  Header'daki dropdown componentlerin tiklanabilir olmasini ve tiklandiginda ilgili icerigin acilmasini kontrol etmek istiyorum.

  Scenario Outline: Header dropdown componentleri tiklanabilir olmali ve ilgili icerigi acmali
    Given I run a header dropdown link check on "<url>"
    Then all header dropdown components should be clickable
    And header dropdown names should include below values
      | name           |
      | Bolum Hakkinda |
      | Egitim         |
      | Kalite         |
      | Ogrenci        |
    And clicked header links should open related content

    Examples:
      | url                              |
      | https://bpmyo.nny.edu.tr/?p=&id= |
      | https://bpmyo.nny.edu.tr/?p=&id= |
      | https://bpmyo.nny.edu.tr/?p=&id= |
      | https://bpmyo.nny.edu.tr/?p=&id= |
