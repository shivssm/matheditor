$(function() {
  
 // $('textarea').focus();
  
  var $caps = $('.capslock'),
      $char = $('.char');
  
  $caps.click(function() {
    if($caps.hasClass('on')) {
      $('.char,.capslock').each(function() {
        $(this).text($(this).text().toLowerCase());
      });
    $caps.removeClass('on');
      
    } else {
      $('.char,.capslock').each(function() {
        $(this).text($(this).text().toUpperCase());
      });
      $caps.addClass('on');
    }
  });
  
  $('li').click(function() {
    var t = this;
     $(this).addClass('touch');
     setTimeout(function() {
       $(t).removeClass('touch');
     },100);
  });
  
  var lastFocus,
      selectionStart,
      selectionEnd;

  $('textarea,input').on('focus', function() {
    $('textarea,input').removeClass('focus');
    $(this).addClass('focus');
  });
  
  $('textarea,input').on('blur', function() {
    lastFocus = this;
    selStart = this.selectionStart;
    selEnd = this.selectionEnd;
  });
  
  $('.char').click(function() {
    var char = $(this).text();
    sendChar(char);
  });
  
  $('.return').click(function() {
    sendChar('\n');
  });
  
  $('.space').click(function() {
    sendChar(' ');
  });
  
  $('.backspace').click(function() {
    backspace();
  });

   $('.sup').click(function() {
    sendChar('x^{a}');
  });

   $('.sub').click(function() {
    sendChar('x_{a}');
  });
  
    $('.frac').click(function() {
    sendChar('\\frac{a}{b}');
  });

    $('.un_sqrt').click(function() {
    sendChar('\\sqrt[b]{a}');
  });
  
  $('.sqrt').click(function() {
    sendChar('\\sqrt{a}');
  });

  $('.int_ab').click(function() {
    sendChar('\\int_a^b');
  });

  $('.bigcap').click(function() {
    sendChar('\\bigcap_a^b');
  });

  $('.bigcup').click(function() {
    sendChar('\\bigcup_a^b');
  });

  $('.sum').click(function() {
    sendChar('\\sum_a^b');
  });

  $('.prod').click(function() {
    sendChar('\\prod_a^b');
  });

  $('.coprod').click(function() {
    sendChar('\\coprod_a^b');
  });

  $('.lim').click(function() {
    sendChar('\\lim_{x\\to a}');
  });

  $('.lxr').click(function() {
    sendChar('\\left(x\\right)');
  });

  $('.lxr1').click(function() {
    sendChar('\\left[x\\right]');
  });

  $('.lxr2').click(function() {
    sendChar('\\left\\{x\\right\\}');
  });

  $('.lxr3').click(function() {
    sendChar('\\left|x\\right|');
  });

  $('.floor').click(function() {
    sendChar('\\lfloor x\\rfloor');
  });

  $('.ceil').click(function() {
    sendChar('\\lceil x\\rceil');
  });

  $('.xangle').click(function() {
    sendChar('\\langle x\\rangle');
  });

  $('.matrix').click(function() {
    sendChar('\\begin{matrix} a & b \\\\ c & d \\end{matrix}');
  });

  $('.matrix_ab').click(function() {
    sendChar('\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}');
  });

  $('.matrix_AB').click(function() {
    sendChar('\\begin{Bmatrix} a & b \\\\ c & d \\end{Bmatrix}');
  });

  $('.pmatrix').click(function() {
    sendChar('\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}');
  });

  $('.binom').click(function() {
    sendChar('\\binom{n}{r}');
  });

  $('.l_matrix_r').click(function() {
    sendChar('\\left\\{\\begin{matrix} a & \\\\ c & \\end{matrix}\\right.');
  });

  $('.lmatrix_r').click(function() {
    sendChar('\\left\\[\\begin{matrix} a & \\\\ c & \\end{matrix}\\right.');
  });

  $('.larrow_ba').click(function() {
    sendChar('\\xleftarrow[b]{a}');
  });

  $('.rarrow_ba').click(function() {
    sendChar('\\xrightarrow[b]{a}');
  });

  $('.larrow_a').click(function() {
    sendChar('\\overleftarrow{a}');
  });

  $('.rarrow_a').click(function() {
    sendChar('\\overrightarrow{a}');
  });

  $('.overline').click(function() {
    sendChar('\\overline{a}');
  });

  $('.red_a').click(function() {
    sendChar('{\\color{Red}a}');
  });

  $('.mathbbR').click(function() {
    sendChar('\\mathbb{R}');
  });

  $('.pm').click(function() {
    sendChar('\\pm');
  });

  $('.mp').click(function() {
    sendChar('\\mp');
  });

  $('.times').click(function() {
    sendChar('\\times');
  });

  $('.div').click(function() {
    sendChar('\\div');
  });

  $('.setminus').click(function() {
    sendChar('\\setminus');
  });

  $('.leqslant').click(function() {
    sendChar('\\leqslant');
  });

  $('.geqslant').click(function() {
    sendChar('\\geqslant');
  });

  $('.ll').click(function() {
    sendChar('\\ll');
  });

  $('.gg').click(function() {
    sendChar('\\gg');
  });

  $('.in').click(function() {
    sendChar('\\in');
  });

  $('.ni').click(function() {
    sendChar('\\ni');
  });

  $('.notin').click(function() {
    sendChar('\\notin');
  });

  $('.forall').click(function() {
    sendChar('\\forall');
  });

  $('.exists').click(function() {
    sendChar('\\exists');
  });

  $('.varnothing').click(function() {
    sendChar('\\varnothing');
  });

  $('.pi').click(function() {
    sendChar('\\pi');
  });

  $('.alpha').click(function() {
    sendChar('\\alpha');
  });

  $('.beta').click(function() {
    sendChar('\\beta');
  });

  $('.Gamma').click(function() {
    sendChar('\\Gamma');
  });

  $('.Delta').click(function() {
    sendChar('\\Delta');
  });

  $('.therefore').click(function() {
    sendChar('\\therefore');
  });

  $('.because').click(function() {
    sendChar('\\because');
  });

  $('.cdots').click(function() {
    sendChar('\\cdots');
  });

  $('.ddots').click(function() {
    sendChar('\\ddots');
  });

  $('.vdots').click(function() {
    sendChar('\\vdots');
  });

  $('.leftarrow').click(function() {
    sendChar('\\leftarrow');
  });

  $('.rightarrow').click(function() {
    sendChar('\\rightarrow');
  });

  $('.Leftarrow').click(function() {
    sendChar('\\Leftarrow');
  });

  $('.Rightarrow').click(function() {
    sendChar('\\Rightarrow');
  });

  $('.mapsto').click(function() {
    sendChar('\\mapsto');
  });

  $('.lr_arrow').click(function() {
    sendChar('\\leftrightarrow');
  });

  $('.lrharppons').click(function() {
    sendChar('\\leftrightharpoons');
  });

  $('.rlharpoons').click(function() {
    sendChar('\\rightleftharpoons');
  });

   $('.space').click(function() {
    sendChar('\\;');
  });
  

  $('.tab').click(function() {
    tab();
  });
  
  function tab() {
    var $inputs = $('textarea,input');
    var currIndex = parseInt($(lastFocus).attr('tabIndex'));
    var highestIndex = -1;
    var selected = false;
    $inputs.each(function() {
      var index = parseInt($(this).attr('tabIndex'));
      if(index > highestIndex) {
        highestIndex = index;
      }
      if(index === currIndex+1) {
        $(this).focus();
        selected = true;
      }
    });
        
    if(!selected && currIndex === highestIndex) {
      $inputs.each(function() {
        var index = parseInt($(this).attr('tabIndex'));
        if(index === 1) {
          $(this).focus();
        }
      });
    }    
  }
  
  function backspace() {
     var orig = $(lastFocus).val();
     var updated = orig.substring(0, selStart-1) + orig.substring(selEnd, orig.length);
     $(lastFocus).val(updated);
     selEnd = --selStart;
     $(lastFocus).focus();
     lastFocus.selectionStart = selStart;
     lastFocus.selectionEnd = selEnd;
  }
  
  function sendChar(char) {
    var orig = $(lastFocus).val();
    var updated =  orig.substring(0, selStart) + char + orig.substring(selEnd, orig.lenght);
    $(lastFocus).val(updated);
    selEnd=++selStart;
    $(lastFocus).focus();
    lastFocus.selectionStart = selStart;
    lastFocus.selectionEnd = selEnd;
  };
  
});

document.getElementById("keyboard").focus();