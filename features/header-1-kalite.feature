Feature: Header-1-Kalite surekli link gezinti kontrolu
  Kalite altindaki sayfalarda surekli link gezinmesinin limit ve hata durumlarini kontrol etmek istiyorum.

  Scenario Outline: Header-1-Kalite sayfasinda surekli gezinti limitte kalmali
    Given I run a quick link availability check on "<url>"
    Then the quick link check should be successful

    Examples:
      | pageName                                   | url                                               |
      | Header-1-Kalite-Komisyon-Uyeleri           | https://bpmyo.nny.edu.tr/index.php?p=content&id=5 |
      | Header-1-Kalite-Oz-Degerlendirme-Raporlari | https://kalite.nny.edu.tr/?p=content&id=308       |
      | Header-1-Kalite-Kalite-Politikamiz         | https://bpmyo.nny.edu.tr/index.php?p=content&id=8 |

  Scenario: Kalite > Komisyon Uyeleri sayfasinda isimler bos olmamali
    Given I open quality commission page "https://bpmyo.nny.edu.tr/index.php?p=content&id=5"
    Then I should see non-empty member names under "Komisyon Uyeleri" heading
