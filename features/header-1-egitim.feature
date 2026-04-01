Feature: Header-1-Egitim surekli link gezinti kontrolu
  Egitim altindaki sayfalarda surekli link gezinmesinin limit ve hata durumlarini kontrol etmek istiyorum.

  Scenario Outline: Header-1-Egitim sayfasinda surekli gezinti limitte kalmali
    Given I run a quick link availability check on "<url>"
    Then the quick link check should be successful

    Examples:
      | pageName                        | url                                                                                                         |
      | Header-1-Egitim-Ders-Icerikleri | https://obs.nny.edu.tr/oibs/bologna/index.aspx                                                              |
      | Header-1-Egitim-Akademik-Takvim | https://www.nny.edu.tr/?p=content&id=47                                                                     |
      | Header-1-Egitim-Ders-Programi   | https://www.nny.edu.tr/2024-2025-egitim-ogretim-yili-guz-yariyili-ders-kayitlari-ve-ders-programlari-a-2079 |
