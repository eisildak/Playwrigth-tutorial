Feature: Header-1-Bolum-Hk surekli link gezinti kontrolu
  Bolum hakkinda altindaki sayfalarda surekli link gezinmesinin limit ve hata durumlarini kontrol etmek istiyorum.

  Scenario Outline: Header-1-Bolum-Hk sayfasinda surekli gezinti limitte kalmali
    Given I run a quick link availability check on "<url>"
    Then the quick link check should be successful

    Examples:
      | pageName                           | url                                                |
      | Header-1-Bolum-Hk-Bolumumuz        | https://bpmyo.nny.edu.tr/index.php?p=content&id=10 |
      | Header-1-Bolum-Hk-Programin-Amaci  | https://bpmyo.nny.edu.tr/index.php?p=content&id=11 |
      | Header-1-Bolum-Hk-Akademik-Kadro   | https://bpmyo.nny.edu.tr/index.php?p=academic      |
      | Header-1-Bolum-Hk-Calisma-Alanlari | https://bpmyo.nny.edu.tr/index.php?p=content&id=12 |
