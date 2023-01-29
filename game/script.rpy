default lunaevent = False

define l = Character('Luna', color= '#ff5858ff')
define mc = Character('[your_name]', color='#005374ff')
default your_name = 'Jay'

label start:
    # scene luna bikini yes
    scene luna pedro before
    l 'Can you tell me what is your name?'
    play music 'audio/waktu ketika.mp3'
    menu:
        'Tell her your name':
            scene luna proud cute
            $ your_name = renpy.input('What is your name?')
            $ your_name = your_name.strip() # Motong space lebih
            mc 'My name is [mc]'
            l 'Pleased to meet you [mc].'
        'Don\'t tell her your name':
            scene luna hoodie suprised
            l 'Even tho you didn\'t tell me your name i still know you'
            l 'Right, [mc]?'
            play sound 'audio/vine-boom.mp3'
            mc 'In the name of Allah, how do you know my name?'
    menu:
        "Lihat":
            scene luna hoodie suprised
            with pixellate
            mc 'Come on, let\'s get some breakfast.'
            l 'nigga'
        "ketika":
            scene luna hoodie suprised
            with fade
            mc 'no n word pls'
return

#  Terima kasih telah menyaksikan
#   Pertandingan lucu